import { IconLayout, IconMapPin, IconSearch, IconGauge, IconLink, IconFileText, IconCursorClick, IconClipboardCheck } from "@/components/icons";
import type { ServiceIcon as ServiceIconKey } from "@/lib/services";

const ICONS: Record<ServiceIconKey, typeof IconLayout> = {
  layout: IconLayout,
  mapPin: IconMapPin,
  search: IconSearch,
  gauge: IconGauge,
  link: IconLink,
  fileText: IconFileText,
  cursorClick: IconCursorClick,
  clipboardCheck: IconClipboardCheck,
};

/** The icon for a service, from its data key — one place to change the mapping. */
export default function ServiceIcon({ icon, className = "h-5 w-5" }: { icon: ServiceIconKey; className?: string }) {
  const Icon = ICONS[icon];
  return <Icon className={className} />;
}
