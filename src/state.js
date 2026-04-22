const TYPE_COLORS = {
  Normal:'#A8A77A', Fire:'#EE8130', Water:'#6390F0', Electric:'#F7D02C', Grass:'#7AC74C', Ice:'#96D9D6',
  Fighting:'#C22E28', Poison:'#A33EA1', Ground:'#E2BF65', Flying:'#A98FF3', Psychic:'#F95587', Bug:'#A6B91A',
  Rock:'#B6A136', Ghost:'#735797', Dragon:'#6F35FC', Dark:'#705746', Steel:'#B7B7CE', Fairy:'#D685AD'
};
const STAT_ORDER = ['HP','ATK','DEF','SpATK','SpDEF','SPE'];
const SP_LEVELS = [0,4,8,12];
const SP_BUDGET = 24;

function createEmptySlot() {
  return {
    pokemon: '',
    isMega: false,
    ability: '',
    nature: 'Serious',
    item: '',
    moves: Array.from({ length: 4 }, () => ['', '']),
    sp: { HP:0, ATK:0, DEF:0, SpATK:0, SpDEF:0, SPE:0 }
  };
}

function createEmptyTeam(name) {
  return {
    id: crypto.randomUUID(),
    name,
    slots: Array.from({ length: 6 }, () => createEmptySlot())
  };
}

window.CTB_STATE = {
  teams: [],
  selectedTeamId: null,
  selectedSlotIndex: 0,
  filters: { pokemonSearch: '', itemSearch: '' },
  data: { pokemon: [], items: null, natures: [], abilities: [], moves: [] }
};
