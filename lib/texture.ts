import * as THREE from "three";

const textureLoader = new THREE.TextureLoader();

export async function fileToTexture(file: File): Promise<THREE.Texture> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem válido.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const texture = await textureLoader.loadAsync(objectUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  } catch {
    throw new Error("Não foi possível converter o arquivo em textura.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
