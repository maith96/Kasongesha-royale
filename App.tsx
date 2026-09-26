import { useCallback, useEffect, useState } from 'react';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { EMPTY_PROGRESS, LEVELS, maxStars, nextLevel, Progress, recordStars, totalStars } from './src/game/campaign';
import type { Standing } from './src/game/match';
import { loadProgress, saveProgress } from './src/game/progressStore';
import { STAGES } from './src/game/stages';
import { Lang, nameOf, setLanguage, strings } from './src/i18n';
import { loadLanguage, saveLanguage } from './src/i18n/languageStore';
import { useStrings } from './src/i18n/useStrings';
import { Campaign } from './src/screens/Campaign';
import { FreePlay, FreePlayOptions } from './src/screens/FreePlay';
import { GameScreen, MatchConfig } from './src/screens/GameScreen';
import { Home } from './src/screens/Home';
import { OnlineMatch } from './src/screens/OnlineMatch';
import { OnlineMenu } from './src/screens/OnlineMenu';
import { ui } from './src/ui/theme';

type Source = { kind: 'free' } | { kind: 'level'; index: number };
type Route =
  | { name: 'home' }
  | { name: 'free' }
  | { name: 'campaign' }
  | { name: 'online' }
  | { name: 'onlineMatch'; code: string }
  // matchNo is bumped to start a fresh match with the same config.
  | { name: 'game'; config: MatchConfig; source: Source; matchNo: number };

function levelConfig(index: number): MatchConfig {
  const l = LEVELS[index];
  const t = strings();
  const label = l.bonusStars !== undefined ? t.campaign.bonus(l.id.slice(1)) : t.campaign.level(l.id);
  return {
    title: `${label} · ${nameOf(t.levels, l.id)}`,
    stage: l.stage,
    surface: l.surface,
    wet: l.wet,
    par: l.par,
    playerCount: 1,
    kicksPerTurn: 1,
    firstPlayer: 0,
  };
}

function freeConfig(o: FreePlayOptions, playerCount: number): MatchConfig {
  const s = STAGES[o.stage];
  return {
    title: strings().stageTitle(o.stage + 1, nameOf(strings().stages, s.name)),
    stage: o.stage,
    surface: o.surface,
    wet: o.wet,
    par: s.par,
    playerCount,
    kicksPerTurn: o.kicksPerTurn,
    firstPlayer: 0,
  };
}

export default function App() {
  const t = useStrings();
  const [language, setLanguageState] = useState<Lang>('en');
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [free, setFree] = useState<FreePlayOptions>({ stage: 0, surface: 0, wet: false, kicksPerTurn: 1 });

  useEffect(() => {
    loadProgress().then(setProgress);
    loadLanguage().then((l) => {
      setLanguage(l);
      setLanguageState(l);
    });
  }, []);

  const changeLanguage = (l: Lang) => {
    setLanguage(l);
    setLanguageState(l);
    saveLanguage(l);
  };

  const play = (config: MatchConfig, source: Source) =>
    setRoute((r) => ({ name: 'game', config, source, matchNo: (r.name === 'game' ? r.matchNo : 0) + 1 }));

  const onFinished = useCallback(
    (results: Standing[]) => {
      if (route.name !== 'game' || route.source.kind !== 'level') return;
      const id = LEVELS[route.source.index].id;
      setProgress((p) => {
        const updated = recordStars(p, id, results[0].stars);
        if (updated !== p) saveProgress(updated);
        return updated;
      });
    },
    [route],
  );

  let screen;
  if (route.name === 'home') {
    screen = (
      <Home
        stars={totalStars(progress)}
        maxStars={maxStars()}
        language={language}
        onLanguage={changeLanguage}
        onCampaign={() => setRoute({ name: 'campaign' })}
        onFreePlay={() => setRoute({ name: 'free' })}
        onOnline={() => setRoute({ name: 'online' })}
      />
    );
  } else if (route.name === 'online') {
    screen = <OnlineMenu onOpen={(code) => setRoute({ name: 'onlineMatch', code })} onBack={() => setRoute({ name: 'home' })} />;
  } else if (route.name === 'onlineMatch') {
    screen = <OnlineMatch key={route.code} code={route.code} onExit={() => setRoute({ name: 'online' })} />;
  } else if (route.name === 'free') {
    screen = (
      <FreePlay
        options={free}
        onChange={setFree}
        onStart={(n) => play(freeConfig(free, n), { kind: 'free' })}
        onBack={() => setRoute({ name: 'home' })}
      />
    );
  } else if (route.name === 'campaign') {
    screen = (
      <Campaign
        progress={progress}
        onPlay={(i) => play(levelConfig(i), { kind: 'level', index: i })}
        onBack={() => setRoute({ name: 'home' })}
      />
    );
  } else {
    const { config, source, matchNo } = route;
    let next: { label: string; onPress: () => void } | null = null;
    if (source.kind === 'level') {
      const n = nextLevel(progress, source.index);
      if (n !== null) next = { label: t.results.nextLevel, onPress: () => play(levelConfig(n), { kind: 'level', index: n }) };
    } else if (config.stage + 1 < STAGES.length) {
      next = {
        label: t.results.nextStage,
        onPress: () => {
          const o = { ...free, stage: config.stage + 1 };
          setFree(o);
          play(freeConfig(o, config.playerCount), { kind: 'free' });
        },
      };
    }
    screen = (
      <GameScreen
        key={matchNo}
        config={config}
        next={next}
        onFinished={onFinished}
        onRestart={() => play(config, source)}
        onRematch={() =>
          play({ ...config, firstPlayer: (config.firstPlayer + 1) % config.playerCount }, source)
        }
        onExit={() => setRoute(source.kind === 'level' ? { name: 'campaign' } : { name: 'free' })}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={ui.screen}>
        {/* Fullscreen: hide the status bar and Android nav bar (swipe from an edge to peek) */}
        <StatusBar style="light" hidden />
        <NavigationBar hidden />
        {screen}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
