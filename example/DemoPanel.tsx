/**
 * A stand-in plugin panel, so `npm run dev` shows something on a fresh clone.
 *
 * Written the way a real plugin is — React Native components, AsyncStorage for
 * state, SDK calls for everything else — so that replacing it with your own
 * component is the only step. Delete this folder once you have.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PluginCommAPI, PluginFileAPI, PluginManager } from 'sn-plugin-lib';

const SETTINGS_KEY = 'demo:settings:v1';

interface Settings {
  compact: boolean;
  label: string;
}

type Tab = 'pages' | 'settings';

export default function DemoPanel(): React.JSX.Element {
  const { height } = useWindowDimensions();
  // The same shape of decision a real panel makes: how much of the screen the
  // panel should take, which differs between devices.
  const panelH = Math.round(height * (height < 2000 ? 0.8 : 0.6));

  const [tab, setTab] = useState<Tab>('pages');
  const [settings, setSettings] = useState<Settings>({ compact: false, label: '' });
  const [where, setWhere] = useState<string>('…');

  useEffect(() => {
    void (async () => {
      const json = await AsyncStorage.getItem(SETTINGS_KEY);
      if (json) setSettings(JSON.parse(json) as Settings);

      const [pathRes, pageRes, totalRes] = await Promise.all([
        PluginCommAPI.getCurrentFilePath(),
        PluginCommAPI.getCurrentPageNum(),
        PluginFileAPI.getNoteTotalPageNum(''),
      ]);
      const name = String(pathRes?.result ?? '').split('/').pop() ?? 'unknown';
      setWhere(`${name} — page ${Number(pageRes?.result ?? 0) + 1} of ${totalRes?.result ?? '?'}`);
    })();
  }, []);

  async function update(next: Partial<Settings>): Promise<void> {
    const merged = { ...settings, ...next };
    setSettings(merged);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  }

  return (
    <Pressable style={s.overlay} onPress={() => PluginManager.closePluginView()}>
      <Pressable style={[s.panel, { height: panelH }]} onPress={e => e.stopPropagation()}>
        <View style={s.header}>
          <Text style={s.title}>Demo plugin</Text>
          <Pressable style={s.close} onPress={() => PluginManager.closePluginView()}>
            <Text style={s.closeText}>✕</Text>
          </Pressable>
        </View>

        <View style={s.tabs}>
          {(['pages', 'settings'] as Tab[]).map(t => (
            <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabOn]}>
              <Text style={[s.tabText, tab === t && s.tabTextOn]}>
                {t === 'pages' ? 'Pages' : 'Settings'}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView style={{ maxHeight: panelH - 120 }} contentContainerStyle={s.body}>
          {tab === 'pages' ? (
            <>
              <Text style={s.heading}>Where you are</Text>
              <Text style={s.desc}>{where}</Text>
              <Text style={[s.heading, { marginTop: 20 }]}>Label</Text>
              <Text style={s.desc}>
                {settings.label
                  ? `This page is labelled "${settings.label}".`
                  : 'No label on this page yet.'}
              </Text>
              <Pressable style={s.btn} onPress={() => void update({ label: 'Monday' })}>
                <Text style={s.btnText}>Label this page</Text>
              </Pressable>
              <Pressable
                style={[s.btn, s.btnQuiet]}
                onPress={() => PluginManager.showToast('Nothing was written — this is a preview.')}
              >
                <Text style={s.btnText}>Show a toast</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={s.heading}>Compact rows</Text>
              <View style={s.row}>
                <Text style={[s.desc, { flex: 1 }]}>
                  Fit more on screen at the cost of tap accuracy.
                </Text>
                <Switch value={settings.compact} onValueChange={v => void update({ compact: v })} />
              </View>
              <Text style={[s.desc, { marginTop: 20 }]}>
                Everything on this screen is stored in AsyncStorage and reloads
                from it, so a scenario in preview.config.tsx can stage it.
              </Text>
            </>
          )}
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  panel: {
    width: '86%', backgroundColor: '#fff', borderWidth: 3, borderColor: '#000',
    borderRadius: 10, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: '#000',
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#000' },
  close: { paddingHorizontal: 10, paddingVertical: 4 },
  closeText: { fontSize: 22, color: '#000' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#bbb' },
  tab: { paddingHorizontal: 20, paddingVertical: 12 },
  tabOn: { borderBottomWidth: 3, borderBottomColor: '#000' },
  tabText: { fontSize: 16, color: '#555' },
  tabTextOn: { color: '#000', fontWeight: 'bold' },
  body: { padding: 20 },
  heading: { fontSize: 17, fontWeight: 'bold', color: '#000', marginBottom: 4 },
  desc: { fontSize: 15, color: '#333', lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: {
    marginTop: 12, backgroundColor: '#000', paddingVertical: 14,
    alignItems: 'center', borderRadius: 6,
  },
  btnQuiet: { backgroundColor: '#444' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
