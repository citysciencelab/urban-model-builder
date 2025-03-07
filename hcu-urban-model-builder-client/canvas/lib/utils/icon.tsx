import Inventory from "@material-design-icons/svg/sharp/inventory.svg";
import Category from "@material-design-icons/svg/sharp/category.svg";
import FlowIcon from "../../icons/flow-icon.svg";
import Autorenew from "@material-design-icons/svg/sharp/autorenew.svg";
import ToggleOff from "@material-design-icons/svg/sharp/toggle_off.svg";
import TransitionPush from "../../icons/transition_push.svg";
import PlayPause from "../../icons/play_pause.svg";
import Groups from "@material-design-icons/svg/sharp/groups.svg";
import Person from "@material-design-icons/svg/sharp/person.svg";
import Folder from "@material-design-icons/svg/sharp/folder.svg";
// import Ghost from "@material-design-icons/svg/sharp/ghost.svg";
import Storage from "@material-design-icons/svg/sharp/storage.svg";

const iconMap = {
  stock: Inventory,
  variable: Category,
  flow: FlowIcon,
  converter: Autorenew,
  state: ToggleOff,
  transition: TransitionPush,
  action: PlayPause,
  population: Groups,
  agent: Person,
  folder: Folder,
  // ghost: Ghost,
  "ogc-api-features": Storage,
} as const;

export type IconNames = keyof typeof iconMap;

export function Icon(props: { icon: IconNames }) {
  if (!(props.icon in iconMap)) {
    throw new Error(`Icon ${props.icon} not found`);
  }
  const SelectedIcon = iconMap[props.icon];
  return <SelectedIcon />;
}
