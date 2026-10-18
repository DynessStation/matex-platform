// Creates the first all-access administrator on a database that has no admin
// accounts yet, for example right after bootstrapping it with `npm run db:migrate`.
//
// Usage (from backend/):
//   npm run admin:create-first -- --name "Full Name" --alias Alias --email a@b.c --phone +628123456789
//   Optional: --company-name "PT Example" --company-alias EXA (used only when no company exists yet)
//             --no-defaults (skip copying the default website content into a newly created company)
//
// When it creates the company, it then runs scripts/seed-company-defaults.cjs so the
// public website starts with the default MATEX pages, navigation, contacts and FAQs.
//
// The password is never accepted as a flag. It is read from a hidden prompt, or
// from stdin when stdin is not a terminal (two lines: password and confirmation).
// The script refuses to run when any admin account already exists.

const { spawnSync } = require("node:child_process");
const path = require("node:path");
const readline = require("node:readline");

require("dotenv").config({ quiet: true });

const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");

// Same rules as POST /api/v1/admin-acct.
const rules = {
  name: (value) =>
    value.length > 0 && value.length <= 50 && /^[\p{L}\s.,'-]+$/u.test(value),
  alias: (value) =>
    value.length > 0 && value.length <= 15 && /^[a-zA-Z0-9]+$/.test(value),
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  phone: (value) => /^\+[1-9]\d{6,14}$/.test(value),
  password: (value) =>
    value.length >= 8 &&
    value.length <= 64 &&
    !/\s/.test(value) &&
    /[^a-zA-Z]/.test(value),
};

const ruleHints = {
  name: "up to 50 letters, spaces, and . , ' -",
  alias: "up to 15 letters or digits, no spaces",
  email: "a valid email address",
  phone: "international format, for example +628123456789",
  password: "8-64 characters, no spaces, at least one non-letter",
};

function requireEnvironment(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function parseFlags(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const match = /^--([a-z-]+)$/.exec(argv[index]);
    if (!match) {
      throw new Error(`Unexpected argument: ${argv[index]}`);
    }
    if (match[1] === "password") {
      throw new Error(
        "Do not pass the password as a flag; it is prompted for instead.",
      );
    }
    if (match[1] === "no-defaults") {
      flags["no-defaults"] = true;
      continue;
    }
    flags[match[1]] = String(argv[index + 1] ?? "").trim();
    index += 1;
  }
  return flags;
}

function createPrompter() {
  if (process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return {
      ask: (question) =>
        new Promise((resolve) =>
          rl.question(question, (answer) => resolve(answer.trim())),
        ),
      askHidden: (question) =>
        new Promise((resolve) => {
          const write = rl._writeToOutput;
          rl._writeToOutput = (text) => {
            if (text.includes(question)) write.call(rl, text);
          };
          rl.question(question, (answer) => {
            rl._writeToOutput = write;
            process.stdout.write("\n");
            resolve(answer);
          });
        }),
      close: () => rl.close(),
    };
  }

  const lines = require("node:fs").readFileSync(0, "utf8").split(/\r?\n/);
  const next = () => lines.shift() ?? "";
  return {
    ask: async () => next().trim(),
    askHidden: async () => next(),
    close: () => {},
  };
}

async function collectValue(prompter, flags, key, label) {
  const value =
    flags[key] ?? (process.stdin.isTTY ? await prompter.ask(`${label}: `) : "");
  if (!rules[key](value)) {
    throw new Error(`Invalid ${key}: expected ${ruleHints[key]}`);
  }
  return value;
}

async function generateUniqueUuid(connection) {
  for (;;) {
    const candidate = Math.floor(100000000 + Math.random() * 900000000);
    const [rows] = await connection.query(
      "SELECT 1 FROM admin_acct WHERE uuid = ? LIMIT 1",
      [candidate],
    );
    if (!rows.length) return candidate;
  }
}

async function run() {
  const flags = parseFlags(process.argv.slice(2));
  const connection = await mysql.createConnection({
    host: requireEnvironment("DB_HOST"),
    port: Number(process.env.DB_PORT) || 3306,
    user: requireEnvironment("DB_USER"),
    password: process.env.DB_PASS || "",
    database: requireEnvironment("DB_NAME"),
    charset: "utf8mb4",
  });
  const prompter = createPrompter();

  try {
    const [[{ total }]] = await connection.query(
      "SELECT COUNT(*) AS total FROM admin_acct",
    );
    if (Number(total) > 0) {
      throw new Error(
        "This database already has admin accounts. Create further admins from the admin panel instead.",
      );
    }

    const name = await collectValue(prompter, flags, "name", "Full name");
    const alias = await collectValue(
      prompter,
      flags,
      "alias",
      "Alias (login display name)",
    );
    const email = (
      await collectValue(prompter, flags, "email", "Email")
    ).toLowerCase();
    const phone = await collectValue(
      prompter,
      flags,
      "phone",
      "Phone (+62...)",
    );

    const password = await prompter.askHidden("Password: ");
    if (!rules.password(password)) {
      throw new Error(`Invalid password: expected ${ruleHints.password}`);
    }
    if ((await prompter.askHidden("Repeat password: ")) !== password) {
      throw new Error("Passwords do not match");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await connection.beginTransaction();
    try {
      const [companies] = await connection.query(
        "SELECT id_master_comp, comp_name FROM master_comp ORDER BY id_master_comp LIMIT 1 FOR UPDATE",
      );
      let idMasterComp;
      let companyCreated = false;
      if (companies.length) {
        idMasterComp = companies[0].id_master_comp;
      } else {
        const companyName = flags["company-name"] || "MATEX";
        const companyAlias = (flags["company-alias"] || companyName).slice(
          0,
          50,
        );
        const [company] = await connection.query(
          `INSERT INTO master_comp
             (comp_name, comp_alias, serial_num, id_comp_category, comp_lvl, created, updated, comp_status)
           VALUES (?, ?, ?, 1, 1, NOW(), NOW(), 1)`,
          [
            companyName,
            companyAlias,
            Math.floor(100000000 + Math.random() * 900000000),
          ],
        );
        idMasterComp = company.insertId;
        companyCreated = true;
      }

      const [office] = await connection.query(
        `INSERT INTO office (id_master_comp, office_name, created, updated, status)
         VALUES (?, 'Kantor Pusat', NOW(), NOW(), 1)`,
        [idMasterComp],
      );
      const [chair] = await connection.query(
        `INSERT INTO chair (id_master_comp, chair_name, chair_status) VALUES (?, 'Administrator', 1)`,
        [idMasterComp],
      );
      const [access] = await connection.query(
        `INSERT INTO admin_access (id_master_comp, access_name, access_description, admin_access_status)
         VALUES (?, 'Super Admin', 'Full access, created by create-first-admin', 1)`,
        [idMasterComp],
      );
      const [account] = await connection.query(
        `INSERT INTO admin_acct
           (id_master_comp, id_office, password, name, alias, email_1, phone_1, uuid,
            id_chair, id_access, is_all_access, created, updated, admin_acct_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW(), 1)`,
        [
          idMasterComp,
          office.insertId,
          passwordHash,
          name,
          alias,
          email,
          phone,
          await generateUniqueUuid(connection),
          chair.insertId,
          access.insertId,
        ],
      );

      await connection.commit();

      console.log(
        `Created all-access admin "${alias}" (id_admin_acct ${account.insertId}).`,
      );
      console.log(
        companyCreated
          ? `Created company id ${idMasterComp}. Set PUBLIC_COMPANY_ID=${idMasterComp} in backend/.env.`
          : `Used existing company id ${idMasterComp}.`,
      );
      return {
        seedCompanyId:
          companyCreated && !flags["no-defaults"] ? idMasterComp : null,
        adminId: account.insertId,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } finally {
    prompter.close();
    await connection.end();
  }
}

// Runs after the admin is committed, so a seeding failure never undoes the account.
function seedDefaults({ seedCompanyId, adminId }) {
  if (!seedCompanyId) return;
  const result = spawnSync(
    process.execPath,
    [
      path.join(__dirname, "seed-company-defaults.cjs"),
      "--company-id",
      String(seedCompanyId),
      "--admin-id",
      String(adminId),
    ],
    { stdio: "inherit", env: process.env },
  );
  if (result.status !== 0) {
    console.error(
      `Default website content was not added. Fix the error above, then run: npm run db:seed:company-defaults -- --company-id ${seedCompanyId}`,
    );
    process.exitCode = 1;
  }
}

run()
  .then(seedDefaults)
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
