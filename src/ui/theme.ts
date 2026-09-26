import { StyleSheet } from 'react-native';

export const CHALK = '#fdf6e3';
export const INK = '#2a1a0c';
export const EARTH = '#7a5634';
export const GOLD = '#f2c14e';

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: EARTH },
  title: { fontSize: 44, fontWeight: '900', color: CHALK, textAlign: 'center' },
  heading: { fontSize: 24, fontWeight: '900', color: CHALK },
  link: { color: CHALK, fontSize: 18, fontWeight: '700' },
  button: {
    backgroundColor: CHALK,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 14,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: { color: INK, fontSize: 18, fontWeight: '800' },
  ghostButton: { backgroundColor: 'transparent', borderWidth: 2, borderColor: CHALK },
  ghostText: { color: CHALK },
  card: { backgroundColor: '#00000033', borderRadius: 16, padding: 16, gap: 8 },
  rule: { color: CHALK, fontSize: 15, lineHeight: 20 },
  // outlined choice chips
  choice: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 2, borderColor: '#fdf6e355' },
  choiceActive: { borderColor: CHALK, backgroundColor: '#00000033' },
  choiceText: { color: CHALK, fontSize: 12, fontWeight: '700', opacity: 0.6 },
  choiceTextActive: { opacity: 1 },
});
