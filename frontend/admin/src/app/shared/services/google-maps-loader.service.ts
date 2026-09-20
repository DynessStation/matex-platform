import { DOCUMENT, isPlatformBrowser } from '@angular/common';

import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { environment } from '../../../environments/environment.development';

//==================================================
//==== WINDOW TYPE
//==================================================

interface GoogleMapsWindow extends Window {
  google?: any;

  __matexGoogleMapsReady?: () => void;
}

//==================================================
//==== SERVICE
//==================================================

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsLoaderService {
  //==================================================
  //==== INJECT
  //==================================================

  private platformId = inject(PLATFORM_ID);

  private document = inject(DOCUMENT);

  //==================================================
  //==== DATA
  //==================================================

  private loadPromise: Promise<void> | null = null;

  private readonly scriptId = 'matex-google-maps-script';

  //==================================================
  //==== LOAD
  //==================================================

  load(): Promise<void> {
    //==================================================
    //==== SSR GUARD
    //==================================================

    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject(
        new Error('Google Maps is only available in the browser'),
      );
    }

    const windowRef = window as GoogleMapsWindow;

    //==================================================
    //==== ALREADY READY
    //==================================================

    if (
      windowRef.google?.maps?.Map &&
      windowRef.google?.maps?.places?.PlaceAutocompleteElement &&
      windowRef.google?.maps?.marker?.AdvancedMarkerElement
    ) {
      return Promise.resolve();
    }

    //==================================================
    //==== CURRENT REQUEST
    //==================================================

    if (this.loadPromise) {
      return this.loadPromise;
    }

    //==================================================
    //==== API KEY
    //==================================================

    const apiKey = environment.GOOGLE_MAPS_API_KEY?.trim();

    if (!apiKey) {
      return Promise.reject(new Error('Google Maps API key is not configured'));
    }

    //==================================================
    //==== LOAD SCRIPT
    //==================================================

    this.loadPromise = new Promise<void>((resolve, reject) => {
      //==================================================
      //==== CALLBACK
      //==================================================

      windowRef.__matexGoogleMapsReady = () => {
        //==================================================
        //==== VALIDATE GOOGLE MAPS
        //==================================================

        if (!windowRef.google?.maps?.Map) {
          reject(new Error('Google Maps failed to initialize'));

          return;
        }

        resolve();
      };

      //==================================================
      //==== EXISTING SCRIPT
      //==================================================

      const existingScript = this.document.getElementById(
        this.scriptId,
      ) as HTMLScriptElement | null;

      if (existingScript) {
        existingScript.remove();
      }

      //==================================================
      //==== SCRIPT
      //==================================================

      const script = this.document.createElement('script');

      script.id = this.scriptId;

      script.async = true;

      script.defer = true;

      //==================================================
      //==== LIBRARIES
      //==================================================

      const params = new URLSearchParams({
        key: apiKey,

        v: 'weekly',

        loading: 'async',

        libraries: 'places,marker,geocoding',

        language: 'id',

        region: 'ID',

        callback: '__matexGoogleMapsReady',
      });

      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

      //==================================================
      //==== ERROR
      //==================================================

      script.onerror = () => {
        this.loadPromise = null;

        reject(new Error('Unable to load Google Maps'));
      };

      //==================================================
      //==== APPEND
      //==================================================

      this.document.head.appendChild(script);
    });

    return this.loadPromise;
  }
}
