import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Lang, LANGUAGE_CODES, LANGUAGES } from '../i18n';
import { useStrings } from '../i18n/useStrings';
import { GOLD, ui } from '../ui/theme';

type Props = {
  stars: number;
  maxStars: number;
  language: Lang;
  onLanguage: (l: Lang) => void;
  onCampaign: () => void;
  onFreePlay: () => void;
  onOnline: () => void;
};

export function Home({ stars, maxStars, language, onLanguage, onCampaign, onFreePlay, onOnline }: Props) {
  const t = useStrings();
  return (
    <View style={styles.fill}>
      <View style={styles.languages}>
        {LANGUAGE_CODES.map((code) => (
          <Pressable key={code} style={[ui.choice, styles.lang, code === language && ui.choiceActive]} onPress={() => onLanguage(code)}>
            <Text style={[ui.choiceText, styles.langText, code === language && ui.choiceTextActive]}>{LANGUAGES[code].languageName}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.wrap}>
        <View style={styles.left}>
          {/* The game's name is a brand, not translated. */}
          <Text style={ui.title}>Kasongesha{'\n'}Royale</Text>
          <View style={ui.card}>
            {t.home.rules.map((rule) => (
              <Text key={rule} style={ui.rule}>
                {rule}
              </Text>
            ))}
          </View>
        </View>
        <View style={styles.right}>
          <Pressable style={[ui.button, styles.big]} onPress={onCampaign}>
            <Text style={ui.buttonText}>{t.home.campaign}</Text>
            <Text style={styles.sub}>
              <Text style={{ color: GOLD }}>★</Text> {stars} / {maxStars}
            </Text>
          </Pressable>
          <Pressable style={[ui.button, styles.big]} onPress={onFreePlay}>
            <Text style={ui.buttonText}>{t.home.freePlay}</Text>
            <Text style={styles.sub}>{t.home.freePlaySub}</Text>
          </Pressable>
          <Pressable style={[ui.button, styles.big]} onPress={onOnline}>
            <Text style={ui.buttonText}>{t.online.title}</Text>
            <Text style={styles.sub}>{t.online.sub}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  languages: { position: 'absolute', top: 10, right: 16, flexDirection: 'row', gap: 6, zIndex: 1 },
  lang: { paddingHorizontal: 10, paddingVertical: 4 },
  langText: { fontSize: 13 },
  wrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 40 },
  left: { alignItems: 'center', gap: 16, flexShrink: 1 },
  right: { gap: 10, width: 280 },
  big: { paddingVertical: 12 },
  sub: { color: '#5b3d22', fontSize: 13, fontWeight: '700', marginTop: 2 },
});
