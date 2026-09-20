import Image from "next/image";

export function Brand() {
  return (
    <div className="brand" aria-label="SentientOS">
      <Image
        alt=""
        className="brand__image"
        height={44}
        priority
        src="/brand/sentient-logo.webp"
        width={44}
      />
    </div>
  );
}
