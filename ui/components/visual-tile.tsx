import Image from "next/image";

import { getVisualAsset } from "@/lib/card-visuals";
import type { Card } from "@/lib/types";

export function VisualTile({ card }: { card: Card }) {
  return (
    <div className="visual-tile">
      <Image
        alt=""
        className="visual-tile__image"
        fill
        sizes="(max-width: 700px) 104px, 150px"
        src={getVisualAsset(card)}
      />
    </div>
  );
}
