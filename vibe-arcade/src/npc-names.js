const NPC_NAMES = [
  'Janusz', 'Grażyna', 'Seba', 'Brajan', 'Karyna', 'Mirek',
  'Ziomek', 'Bożena', 'Andrzej', 'Wiesław', 'Halina', 'Dariusz',
  'Patryk', 'Kuba', 'Marta', 'Ola', 'Tomek', 'Basia', 'Marek', 'Ewa',
  'Zbyszek', 'Jolanta', 'Krzysztof', 'Magda', 'Piotrek', 'Asia',
  'Bartek', 'Karolina', 'Dawid', 'Zuzia',
];

export function getRandomName() {
  return NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)];
}
