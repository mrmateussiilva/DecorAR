export type Vec3Tuple = [number, number, number];

export type PanelItem = {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  position: Vec3Tuple;
  rotation: Vec3Tuple;
};
