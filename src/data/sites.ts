import type { LaunchSite } from '../sim/types';

export const SITES: Record<string, LaunchSite> = {
  lc39a: {
    id: 'lc39a',
    name: 'Kennedy LC-39A',
    latitude: 28.6,
    longitude: -80.6,
    defaultAzimuth: 90,
    blurb: 'Florida east coast. Eastward over the Atlantic — strong rotation bonus for LEO/GTO.',
  },
  ccsfs: {
    id: 'ccsfs',
    name: 'Cape Canaveral SFS',
    latitude: 28.5,
    longitude: -80.5,
    defaultAzimuth: 90,
    blurb: 'Adjacent to KSC. Standard eastern range for LEO and GTO.',
  },
  vandenberg: {
    id: 'vandenberg',
    name: 'Vandenberg SFB',
    latitude: 34.7,
    longitude: -120.6,
    defaultAzimuth: 196,
    blurb: 'California. Launches south over the Pacific — the home of polar / Sun-synchronous orbits.',
  },
  baikonur: {
    id: 'baikonur',
    name: 'Baikonur Cosmodrome',
    latitude: 45.6,
    longitude: 63.3,
    defaultAzimuth: 90,
    blurb: 'Kazakhstan. High latitude favors high-inclination orbits (51.6° ISS plane).',
  },
  kourou: {
    id: 'kourou',
    name: 'Guiana Space Centre, Kourou',
    latitude: 5.2,
    longitude: -52.8,
    defaultAzimuth: 90,
    blurb: 'Near the equator — maximum rotation bonus and the best site for GTO / equatorial.',
  },
  starbase: {
    id: 'starbase',
    name: 'Starbase, Boca Chica',
    latitude: 25.9,
    longitude: -97.2,
    defaultAzimuth: 93,
    blurb: 'South Texas Gulf coast. Eastward launches for methalox vehicles.',
  },
};

export const SITE_LIST = Object.values(SITES);
