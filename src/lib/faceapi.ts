import * as faceapi from "face-api.js";

const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

let loadPromise: Promise<void> | null = null;

export function loadFaceModels(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    })();
  }
  return loadPromise;
}

export async function getFaceDescriptor(
  video: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
): Promise<Float32Array | null> {
  const result = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result?.descriptor ?? null;
}

export function compareDescriptors(
  a: Float32Array | number[],
  b: Float32Array | number[],
): number {
  const aArr = a instanceof Float32Array ? a : new Float32Array(a);
  const bArr = b instanceof Float32Array ? b : new Float32Array(b);
  return faceapi.euclideanDistance(aArr, bArr);
}

export const FACE_MATCH_THRESHOLD = 0.55;

export { faceapi };
