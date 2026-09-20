import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IOfficeLocationValue } from '../../../interface/office.interface';

import { GoogleMapsLoaderService } from '../../../services/google-maps-loader.service';

import { environment } from '../../../../../environments/environment.development';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

//==================================================
//==== COMPONENT
//==================================================

@Component({
  selector: 'app-location-picker',

  imports: [TranslateModule],

  templateUrl: './location-picker.html',

  styleUrl: './location-picker.scss',
})
export class LocationPicker implements AfterViewInit {
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private loader = inject(GoogleMapsLoaderService);

  readonly value = input<IOfficeLocationValue | null>(null);

  readonly locationChange = output<IOfficeLocationValue>();

  readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  readonly autocompleteContainer = viewChild<ElementRef<HTMLDivElement>>(
    'autocompleteContainer',
  );

  public loading = true;

  public error = '';

  private map: any = null;

  private marker: any = null;

  private geocoder: any = null;

  private autocomplete: any = null;

  //==================================================
  //==== MAP STATE
  //==================================================

  private readonly mapReady = signal(false);

  private lastLocationSignature = '';

  //==================================================
  //==== CONSTRUCTOR
  //==================================================

  constructor() {
    //==================================================
    //==== SYNC LOCATION
    //==================================================

    effect(() => {
      const ready = this.mapReady();

      const value = this.value();

      if (!ready || !value || !this.map || !this.marker) {
        return;
      }

      this.syncLocation(value);
    });

    //==================================================
    //==== LANGUAGE CHANGE
    //==================================================

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateAutocompleteLanguage();
      });
  }

  //==================================================
  //==== INIT
  //==================================================

  async ngAfterViewInit(): Promise<void> {
    try {
      //==================================================
      //==== LOAD GOOGLE MAPS
      //==================================================

      await this.loader.load();

      const googleMaps = (window as any).google?.maps;

      if (!googleMaps) {
        throw new Error('Google Maps is not available');
      }

      //==================================================
      //==== LIBRARIES
      //==================================================

      const MapClass = googleMaps.Map;

      const AdvancedMarkerElement = googleMaps.marker?.AdvancedMarkerElement;

      const PlaceAutocompleteElement =
        googleMaps.places?.PlaceAutocompleteElement;

      const Geocoder = googleMaps.Geocoder;

      if (!MapClass) {
        throw new Error('Google Maps library is not available');
      }

      if (!AdvancedMarkerElement) {
        throw new Error('Google Maps marker library is not available');
      }

      if (!PlaceAutocompleteElement) {
        throw new Error('Google Places library is not available');
      }

      if (!Geocoder) {
        throw new Error('Google Geocoding library is not available');
      }

      //==================================================
      //==== INITIAL LOCATION
      //==================================================

      const initial = this.value();

      const center = {
        lat: initial?.lat ?? -6.595038,

        lng: initial?.lng ?? 106.816635,
      };

      //==================================================
      //==== MAP ELEMENT
      //==================================================

      const mapElement = this.mapContainer()?.nativeElement;

      if (!mapElement) {
        throw new Error('Map container is not available');
      }

      //==================================================
      //==== MAP
      //==================================================

      this.map = new MapClass(mapElement, {
        center,

        zoom: initial ? 17 : 12,

        mapId: environment.GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',

        mapTypeControl: false,

        streetViewControl: false,

        fullscreenControl: true,
      });

      //==================================================
      //==== MARKER
      //==================================================

      this.marker = new AdvancedMarkerElement({
        map: this.map,

        position: initial ? center : null,

        gmpDraggable: true,
      });

      //==================================================
      //==== GEOCODER
      //==================================================

      this.geocoder = new Geocoder();

      //==================================================
      //==== AUTOCOMPLETE CONTAINER
      //==================================================

      const autocompleteContainer = this.autocompleteContainer()?.nativeElement;

      if (!autocompleteContainer) {
        throw new Error('Autocomplete container is not available');
      }

      autocompleteContainer.innerHTML = '';

      //==================================================
      //==== AUTOCOMPLETE
      //==================================================

      this.autocomplete = new PlaceAutocompleteElement();

      this.updateAutocompleteLanguage();

      autocompleteContainer.appendChild(this.autocomplete);

      //==================================================
      //==== PLACE SELECT
      //==================================================

      this.autocomplete.addEventListener(
        'gmp-select',

        async (event: any) => {
          try {
            const prediction = event.placePrediction;

            if (!prediction) {
              return;
            }

            const place = prediction.toPlace();

            //==================================================
            //==== PLACE DETAILS
            //==================================================

            await place.fetchFields({
              fields: [
                'id',
                'displayName',
                'formattedAddress',
                'location',
                'addressComponents',
                'googleMapsURI',
                'viewport',
              ],
            });

            if (!place.location) {
              return;
            }

            //==================================================
            //==== POSITION
            //==================================================

            const lat = place.location.lat();

            const lng = place.location.lng();

            this.setMarker(lat, lng);

            //==================================================
            //==== VIEWPORT
            //==================================================

            if (place.viewport) {
              this.map.fitBounds(place.viewport);
            } else {
              this.map.setCenter({
                lat,
                lng,
              });

              this.map.setZoom(17);
            }

            //==================================================
            //==== ADDRESS
            //==================================================

            const addressData = this.parsePlaceComponents(
              place.addressComponents ?? [],
            );

            //==================================================
            //==== EMIT
            //==================================================

            this.locationChange.emit({
              address: place.formattedAddress ?? null,

              city: addressData.city,

              province: addressData.province,

              postal_code: addressData.postalCode,

              lat,

              lng,

              google_place_id: place.id ?? null,

              google_maps_url: place.googleMapsURI ?? null,
            });
          } catch (error) {
            console.error('Google place selection error:', error);
          }
        },
      );

      //==================================================
      //==== MAP CLICK
      //==================================================

      this.map.addListener(
        'click',

        async (event: any) => {
          if (!event.latLng) {
            return;
          }

          await this.reverseGeocode(
            event.latLng.lat(),

            event.latLng.lng(),
          );
        },
      );

      //==================================================
      //==== MARKER DRAG
      //==================================================

      this.marker.addEventListener(
        'gmp-dragend',

        async (event: any) => {
          const position = event.target?.position ?? this.marker.position;

          if (!position) {
            return;
          }

          const lat =
            typeof position.lat === 'function'
              ? position.lat()
              : Number(position.lat);

          const lng =
            typeof position.lng === 'function'
              ? position.lng()
              : Number(position.lng);

          await this.reverseGeocode(lat, lng);
        },
      );

      //==================================================
      //==== READY
      //==================================================

      this.mapReady.set(true);

      this.loading = false;
    } catch (error) {
      console.error('Location picker initialization error:', error);

      this.loading = false;

      this.error = 'location_picker_ui.unavailable';
    }
  }

  //==================================================
  //==== AUTOCOMPLETE LANGUAGE
  //==================================================

  private updateAutocompleteLanguage(): void {
    if (!this.autocomplete) {
      return;
    }

    this.autocomplete.placeholder = this.translate.instant(
      'location_picker_ui.search_placeholder',
    );
  }

  //==================================================
  //==== SYNC LOCATION
  //==================================================

  private syncLocation(value: IOfficeLocationValue): void {
    const lat = Number(value.lat);

    const lng = Number(value.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    //==================================================
    //==== SIGNATURE
    //==================================================

    const signature = [lat, lng, value.google_place_id ?? ''].join('|');

    if (signature === this.lastLocationSignature) {
      return;
    }

    this.lastLocationSignature = signature;

    //==================================================
    //==== POSITION
    //==================================================

    const position = {
      lat,
      lng,
    };

    //==================================================
    //==== MARKER
    //==================================================

    this.marker.position = position;

    //==================================================
    //==== MAP
    //==================================================

    this.map.setCenter(position);

    this.map.setZoom(17);
  }

  //==================================================
  //==== SET MARKER
  //==================================================

  private setMarker(
    lat: number,

    lng: number,
  ): void {
    this.marker.position = {
      lat,
      lng,
    };
  }

  //==================================================
  //==== REVERSE GEOCODE
  //==================================================

  private async reverseGeocode(
    lat: number,

    lng: number,
  ): Promise<void> {
    this.setMarker(lat, lng);

    this.map.panTo({
      lat,
      lng,
    });

    const result = await this.geocoder.geocode({
      location: {
        lat,
        lng,
      },
    });

    const first = result.results?.[0];

    if (!first) {
      return;
    }

    const addressData = this.parseLegacyComponents(
      first.address_components ?? [],
    );

    const placeId = first.place_id ?? null;

    this.locationChange.emit({
      address: first.formatted_address ?? null,

      city: addressData.city,

      province: addressData.province,

      postal_code: addressData.postalCode,

      lat,

      lng,

      google_place_id: placeId,

      google_maps_url: placeId
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(placeId)}`
        : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
  }

  //==================================================
  //==== NEW PLACE COMPONENTS
  //==================================================

  private parsePlaceComponents(components: any[]) {
    const getLong = (type: string) =>
      components.find((item) => item.types?.includes(type))?.longText ?? null;

    return {
      city:
        getLong('administrative_area_level_2') ??
        getLong('locality') ??
        getLong('postal_town'),

      province: getLong('administrative_area_level_1'),

      postalCode: getLong('postal_code'),
    };
  }

  //==================================================
  //==== LEGACY GEOCODER COMPONENTS
  //==================================================

  private parseLegacyComponents(components: any[]) {
    const getLong = (type: string) =>
      components.find((item) => item.types?.includes(type))?.long_name ?? null;

    return {
      city:
        getLong('administrative_area_level_2') ??
        getLong('locality') ??
        getLong('postal_town'),

      province: getLong('administrative_area_level_1'),

      postalCode: getLong('postal_code'),
    };
  }
}
