import { BootScene } from './BootScene';
import { TitleScene } from './TitleScene';
import { BattleScene } from './BattleScene';
import { MapScene } from './MapScene';
import { EventScene, RestScene, RewardScene, ShopScene, TreasureScene } from './NodeScenes';
import { OverflowScene, PackOpenScene, StarterScene } from './PackScenes';

export const SCENES = [BootScene, TitleScene, StarterScene, PackOpenScene, OverflowScene, BattleScene, MapScene, RewardScene, ShopScene, EventScene, RestScene, TreasureScene];
