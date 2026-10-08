import { chooseStarter, collectOpened, enterNode, availableNodes } from '../core/run';
import { G } from '../game/state';
import { goRun } from '../game/router';
import { button, title } from '../ui/widgets';
import { BaseScene } from './BaseScene';

export class TitleScene extends BaseScene {
  constructor() {
    super('Title');
  }
  create(): void {
    this.setup();
    title(this, 320, 80, 'PACKBOUND', '#ffd27a', 16);
    button(this, 260, 160, 120, 24, 'NEW RUN', () => {
      const run = G.startRun('kaede', 'kaede_default');
      chooseStarter(run, 0);
      collectOpened(run);
      enterNode(run, availableNodes(run)[0].id);
      goRun(this);
    });
    if (G.hasRun()) button(this, 260, 194, 120, 24, 'CONTINUE', () => goRun(this));
  }
}
