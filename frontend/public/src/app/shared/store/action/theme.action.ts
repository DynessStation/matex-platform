export class GetHomePage {
  static readonly type = '[Home Page] Get';
  constructor(
    public slug?: string,
    public locale: 'id-ID' | 'en-US' = 'id-ID',
  ) {}
}
