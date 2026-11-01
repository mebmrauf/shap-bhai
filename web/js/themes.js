// Cosmetic only: boards and skins never change the rules or the simulation.
export const THEMES = Object.freeze({
  dhaka: { label: 'Dhaka street', sky: '#f6b26b', ground: '#4b4f58', tiles: ['#3b4048', '#454b54'], edge: '#d7263d', trim: '#ffc300', food: 'ফুচকা' },
  rooftop: { label: 'Old Dhaka rooftop', sky: '#f7a8b8', ground: '#a85a42', tiles: ['#7d4a38', '#8a5441'], edge: '#0f8b8d', trim: '#ffd166', food: 'রসগোল্লা' },
  coxs: { label: "Cox's Bazar beach", sky: '#86d5ee', ground: '#e8cd8e', tiles: ['#c9a968', '#d3b474'], edge: '#ef476f', trim: '#06d6a0', food: 'ইলিশ' },
  sundarbans: { label: 'Sundarbans', sky: '#a8d8b9', ground: '#2d5a38', tiles: ['#3c5a30', '#456636'], edge: '#f77f00', trim: '#fcbf49', food: 'ঝালমুড়ি' }
});
export const SKINS = Object.freeze({
  nagin: { label: 'Rickshaw Nagin', unlock: 0, head: '#7bd81e', body: ['#a8f04a', '#ffd23f', '#a8f04a', '#ff4d7d'] },
  kalnagini: { label: 'Kal Nagini · কালনাগিনী', unlock: 0, head: '#20202c', body: ['#2d2d3c', '#e0b02f', '#2d2d3c'], hood: true, eye: '#ff1f2d' },
  tiger: { label: 'Tiger Stripe', unlock: 50, head: '#ff8a1f', body: ['#ff9d2e', '#ff9d2e', '#22201c'] },
  tea: { label: 'Tea-Stall Snake', unlock: 150, head: '#a9642a', body: ['#c98a4b', '#f5e6c8', '#c98a4b', '#7c4a1e'] },
  jersey: { label: 'Jersey Snake', unlock: 300, head: '#c8102e', body: ['#006a4e', '#006a4e', '#e4002b'] }
});
// 0 fuchka, 1 jhalmuri, 2 roshogolla, 3 ilish. Decided by the cell, so the picture and the spoken line always match.
export const foodKind = cell => (cell.x * 7 + cell.y * 13) % 4;
