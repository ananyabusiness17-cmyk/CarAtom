export const MAKES = [
  { id: 'maruti', label: 'Maruti', logoKey: 'MS' },
  { id: 'hyundai', label: 'Hyundai', logoKey: 'HY' },
  { id: 'honda', label: 'Honda', logoKey: 'HO' },
  { id: 'tata', label: 'Tata', logoKey: 'TA' },
  { id: 'mahindra', label: 'Mahindra', logoKey: 'MA' },
  { id: 'toyota', label: 'Toyota', logoKey: 'TO' },
  { id: 'kia', label: 'Kia', logoKey: 'KI' },
  { id: 'skoda', label: 'Skoda', logoKey: 'SK' },
  { id: 'volkswagen', label: 'Volkswagen', logoKey: 'VW' },
] as const;

export const MODELS_BY_MAKE: Record<string, Array<{ name: string; bodyType: string }>> = {
  honda: [
    { name: 'Amaze', bodyType: 'Compact' },
    { name: 'City', bodyType: 'Sedan' },
    { name: 'Jazz', bodyType: 'Hatch' },
    { name: 'WR-V', bodyType: 'SUV' },
    { name: 'Elevate', bodyType: 'SUV' },
    { name: 'Civic', bodyType: 'Sedan' },
  ],
  maruti: [
    { name: 'Swift', bodyType: 'Hatch' },
    { name: 'Baleno', bodyType: 'Hatch' },
    { name: 'Dzire', bodyType: 'Sedan' },
    { name: 'Brezza', bodyType: 'SUV' },
  ],
  hyundai: [
    { name: 'i20', bodyType: 'Hatch' },
    { name: 'Venue', bodyType: 'SUV' },
    { name: 'Creta', bodyType: 'SUV' },
    { name: 'Verna', bodyType: 'Sedan' },
  ],
  tata: [
    { name: 'Nexon', bodyType: 'SUV' },
    { name: 'Punch', bodyType: 'SUV' },
    { name: 'Tiago', bodyType: 'Hatch' },
  ],
  mahindra: [
    { name: 'XUV700', bodyType: 'SUV' },
    { name: 'Thar', bodyType: 'SUV' },
    { name: 'Scorpio-N', bodyType: 'SUV' },
  ],
  toyota: [
    { name: 'Glanza', bodyType: 'Hatch' },
    { name: 'Hyryder', bodyType: 'SUV' },
    { name: 'Innova', bodyType: 'MPV' },
  ],
  kia: [
    { name: 'Seltos', bodyType: 'SUV' },
    { name: 'Sonet', bodyType: 'SUV' },
    { name: 'Carnival', bodyType: 'MPV' },
  ],
  skoda: [
    { name: 'Kushaq', bodyType: 'SUV' },
    { name: 'Slavia', bodyType: 'Sedan' },
  ],
  volkswagen: [
    { name: 'Virtus', bodyType: 'Sedan' },
    { name: 'Taigun', bodyType: 'SUV' },
  ],
};

export const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

export const FUELS = [
  { id: 'PETROL', label: 'Petrol' },
  { id: 'DIESEL', label: 'Diesel' },
  { id: 'CNG', label: 'CNG' },
  { id: 'EV', label: 'EV' },
] as const;
