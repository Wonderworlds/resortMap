import type { ComponentType, SVGProps } from 'react';
import { RestaurantIcon } from './icons/RestaurantIcon';
import { CafeIcon } from './icons/CafeIcon';
import { HotelIcon } from './icons/HotelIcon';
import { ParkingIcon } from './icons/ParkingIcon';
import { RestroomIcon } from './icons/RestroomIcon';
import { FirstAidIcon } from './icons/FirstAidIcon';
import { InfoIcon } from './icons/InfoIcon';
import { ShopIcon } from './icons/ShopIcon';
import { PoolIcon } from './icons/PoolIcon';
import { SkiLiftIcon } from './icons/SkiLiftIcon';
import { EntranceIcon } from './icons/EntranceIcon';
import { AccessibilityIcon } from './icons/AccessibilityIcon';

export type PoiIconEntry = {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const POI_ICONS: Record<string, PoiIconEntry> = {
  restaurant: { label: 'Restaurant', Icon: RestaurantIcon },
  cafe: { label: 'Cafe', Icon: CafeIcon },
  hotel: { label: 'Hotel', Icon: HotelIcon },
  parking: { label: 'Parking', Icon: ParkingIcon },
  restroom: { label: 'Restroom', Icon: RestroomIcon },
  'first-aid': { label: 'First Aid', Icon: FirstAidIcon },
  info: { label: 'Information', Icon: InfoIcon },
  shop: { label: 'Shop', Icon: ShopIcon },
  pool: { label: 'Pool', Icon: PoolIcon },
  'ski-lift': { label: 'Ski Lift', Icon: SkiLiftIcon },
  entrance: { label: 'Entrance', Icon: EntranceIcon },
  accessibility: { label: 'Accessibility', Icon: AccessibilityIcon },
};
