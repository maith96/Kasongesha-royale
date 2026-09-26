import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { STAGES } from '../game/stages';
import { SURFACES } from '../game/surfaces';
import { useStrings } from '../i18n/useStrings';
import { createMatch, joinMatch, loadName, OnlineError, saveName } from '../online/api';
import { CODE_LENGTH, cleanName, MAX_NAME, MAX_PLAYERS, MIN_PLAYERS, normaliseCode, OnlineConfig } from '../online/model';
import { Picker } from '../ui/Picker';
import { CHALK, ui } from '../ui/theme';

type Props = { onOpen: (code: string) => void; onBack: () => void };

export function OnlineMenu({ onOpen, onBack }: Props) {
  const t = useStrings();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [config, setConfig] = useState<OnlineConfig>({ stage: 0, surface: 0, wet: false, kicksPerTurn: 1 });
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadName().then((n) => n && setName(n));
  }, []);

  const run = async (action: () => Promise<string>) => {
    const n = cleanName(name);
    if (!n) return setError(t.online.errors.name);
    setError('');
    setBusy(true);
    saveName(n);
    try {
      onOpen(await action());
    } catch (e) {
      const reason = e instanceof OnlineError ? e.reason : 'network';
      setError(t.online.errors[reason]);
    } finally {
      setBusy(false);
    }
  };

  const create = () => run(() => createMatch(cleanName(name), config, maxPlayers));
  const join = () => {
    if (normaliseCode(code).length !== CODE_LENGTH) return setError(t.online.errors.code);
    return run(() => joinMatch(code, cleanName(name)));
  };

  const set = (patch: Partial<OnlineConfig>) => setConfig({ ...config, ...patch });

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={ui.link}>{t.common.back}</Text>
        </Pressable>
        <Text style={ui.heading}>{t.online.title}</Text>
        <View style={styles.nameRow}>
          <Text style={styles.label}>{t.online.yourName}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t.online.namePlaceholder}
            placeholderTextColor="#fdf6e377"
            maxLength={MAX_NAME}
            style={[styles.input, styles.nameInput]}
          />
        </View>
      </View>

      <View style={styles.columns}>
        <View style={[ui.card, styles.col]}>
          <Text style={styles.title}>{t.online.host}</Text>
          <Picker
            items={STAGES.map((x) => ({ icon: x.icon, name: t.stages[x.name as keyof typeof t.stages] }))}
            value={config.stage}
            onChange={(i) => set({ stage: i })}
          />
          <Picker
            items={SURFACES.map((x) => ({ icon: x.icon, name: t.surfaces[x.name as keyof typeof t.surfaces] }))}
            value={config.surface}
            onChange={(i) => set({ surface: i })}
          />
          <View style={styles.row}>
            <Pressable style={[ui.choice, styles.flex, config.wet && ui.choiceActive]} onPress={() => set({ wet: !config.wet })}>
              <Text style={[ui.choiceText, styles.big, config.wet && ui.choiceTextActive]}>{config.wet ? t.freePlay.rainy : t.freePlay.dry}</Text>
            </Pressable>
            <Chooser label={t.freePlay.kicksPerTurn} options={[1, 2, 3]} value={config.kicksPerTurn} onChange={(k) => set({ kicksPerTurn: k })} />
          </View>
          <View style={styles.row}>
            {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i).map((n) => (
              <Pressable key={n} style={[ui.choice, styles.flex, styles.pad, n === maxPlayers && ui.choiceActive]} onPress={() => setMaxPlayers(n)}>
                <Text style={[ui.choiceText, styles.big, n === maxPlayers && ui.choiceTextActive]}>{t.online.players(n)}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={[ui.button, styles.action]} onPress={create} disabled={busy}>
            <Text style={ui.buttonText}>{t.online.create}</Text>
          </Pressable>
        </View>

        <View style={[ui.card, styles.col, styles.joinCol]}>
          <Text style={styles.title}>{t.online.joinTitle}</Text>
          <TextInput
            value={code}
            onChangeText={(v) => setCode(normaliseCode(v))}
            placeholder={t.online.codePlaceholder}
            placeholderTextColor="#fdf6e355"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={CODE_LENGTH}
            style={[styles.input, styles.codeInput]}
          />
          <Pressable style={[ui.button, styles.action]} onPress={join} disabled={busy}>
            <Text style={ui.buttonText}>{t.online.join}</Text>
          </Pressable>
          {busy && (
            <View style={styles.row}>
              <ActivityIndicator color={CHALK} />
              <Text style={styles.label}>{t.online.connecting}</Text>
            </View>
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
      </View>
    </ScrollView>
  );
}

function Chooser({ label, options, value, onChange }: { label: string; options: number[]; value: number; onChange: (v: number) => void }) {
  return (
    <View style={[ui.choice, styles.chooser]}>
      <Text style={[ui.choiceText, ui.choiceTextActive]}>{label}</Text>
      {options.map((k) => (
        <Pressable key={k} style={[styles.chooserButton, k === value && ui.choiceActive]} onPress={() => onChange(k)}>
          <Text style={[ui.choiceText, styles.big, k === value && ui.choiceTextActive]}>{k}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  columns: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  col: { flex: 1, gap: 8 },
  joinCol: { flex: 0.7 },
  title: { color: CHALK, fontSize: 18, fontWeight: '900' },
  label: { color: CHALK, fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  flex: { flex: 1, paddingVertical: 8 },
  pad: { paddingHorizontal: 4 },
  big: { fontSize: 14 },
  chooser: { flex: 1.4, flexDirection: 'row', justifyContent: 'space-between', gap: 4, paddingHorizontal: 8, alignSelf: 'stretch' },
  chooserButton: { width: 30, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  input: {
    borderWidth: 2,
    borderColor: CHALK,
    borderRadius: 12,
    color: CHALK,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '700',
    backgroundColor: '#00000033',
  },
  nameInput: { width: 200 },
  codeInput: { fontSize: 30, letterSpacing: 8, textAlign: 'center', fontWeight: '900' },
  action: { minWidth: 0, marginTop: 4 },
  error: { color: '#ffd2cc', backgroundColor: '#b23a2e', borderRadius: 10, padding: 8, fontWeight: '700' },
});

