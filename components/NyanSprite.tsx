// Pikselowy Nyan Cat z tęczą – wspólny dla czatu i ekranu logowania

// Piksele kota: [kolor, x, y, szerokość, wysokość]
type Px = [string, number, number, number, number];

const TAIL: Px[] = [
  ["#000", 4, 9, 7, 4],
  ["#999", 5, 10, 6, 2],
];

const LEGS: Px[] = [
  ["#000", 10, 17, 4, 4], ["#999", 11, 17, 2, 3],
  ["#000", 15, 17, 4, 4], ["#999", 16, 17, 2, 3],
  ["#000", 23, 17, 4, 4], ["#999", 24, 17, 2, 3],
  ["#000", 28, 17, 4, 4], ["#999", 29, 17, 2, 3],
];

const BODY: Px[] = [
  ["#000", 9, 0, 23, 19],
  ["#fc9", 10, 1, 21, 17],
  ["#f9f", 12, 3, 17, 13],
  ["#f39", 14, 5, 1, 1], ["#f39", 18, 4, 1, 1], ["#f39", 23, 4, 1, 1],
  ["#f39", 26, 5, 1, 1], ["#f39", 13, 10, 1, 1], ["#f39", 16, 8, 1, 1],
  ["#f39", 15, 13, 1, 1], ["#f39", 18, 11, 1, 1],
];

const HEAD: Px[] = [
  ["#000", 21, 4, 4, 4], ["#000", 29, 4, 4, 4],
  ["#000", 20, 7, 14, 11],
  ["#999", 22, 5, 2, 3], ["#999", 30, 5, 2, 3],
  ["#999", 21, 8, 12, 9],
  ["#f99", 22, 13, 2, 2], ["#f99", 31, 13, 2, 2],
  ["#000", 27, 12, 1, 1],
  ["#000", 25, 13, 1, 1], ["#000", 29, 13, 1, 1], ["#000", 25, 14, 5, 1],
];

// Oczy osobno, żeby kot mógł mrugać
const EYES: Px[] = [
  ["#000", 24, 10, 2, 2], ["#fff", 24, 10, 1, 1],
  ["#000", 29, 10, 2, 2], ["#fff", 29, 10, 1, 1],
];

function Pixels({ list }: { list: Px[] }) {
  return list.map(([fill, x, y, w, h], i) => (
    <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
  ));
}

function Head() {
  return (
    <g className="cat-head">
      <Pixels list={HEAD} />
      <g className="cat-eyes">
        <Pixels list={EYES} />
      </g>
    </g>
  );
}

export default function NyanSprite() {
  return (
    <div className="nyan__sprite">
      <div className="rainbow">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
      <svg viewBox="0 0 34 21" width="136" height="84" shapeRendering="crispEdges">
        <Pixels list={TAIL} />
        <g className="legs">
          <Pixels list={LEGS} />
        </g>
        <Pixels list={BODY} />
        <Head />
      </svg>
    </div>
  );
}

// Pikselowa głowa kota – ikonka przy odpowiedziach bota
export function NyanFace() {
  return (
    <svg viewBox="20 4 14 14" width="22" height="22" shapeRendering="crispEdges" aria-hidden="true">
      <Head />
    </svg>
  );
}
