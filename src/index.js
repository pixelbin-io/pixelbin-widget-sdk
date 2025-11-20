import WidgetController from './core/WidgetController';
import { VERSION } from './constants';

const init = (config) => new WidgetController(config);
init.VERSION = VERSION;

export { init };
export default { init };


