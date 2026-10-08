import { BootScene } from './BootScene';
import { HeroSelectScene, RunEndScene, TitleScene } from './MenuScenes';
import { BattleScene } from './BattleScene';
import { MapScene } from './MapScene';
import { AchievementsScene, CollectionScene, SettingsScene } from './MetaScenes';
import { EventScene, RestScene, RewardScene, ShopScene, TreasureScene } from './NodeScenes';
import { OverflowScene, PackOpenScene, StarterScene } from './PackScenes';

export const SCENES = [BootScene, TitleScene, StarterScene, PackOpenScene, OverflowScene, BattleScene, MapScene, RewardScene, ShopScene, EventScene, RestScene, TreasureScene, HeroSelectScene, RunEndScene, CollectionScene, AchievementsScene, SettingsScene];
