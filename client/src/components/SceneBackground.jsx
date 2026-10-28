import { optimizeImg } from '../utils/format';

// Full-screen fixed background behind the page. Photos crossfade (with a slow zoom) as you scroll.
// With no photos it shows a soft animated gradient, so the page still looks finished.
export default function SceneBackground({ images, index }) {
  const n = images.length;
  return (
    <div className="scene" aria-hidden="true">
      {n === 0 ? (
        <div className="scene-aurora" />
      ) : (
        images.map((src, i) => (
          <div
            key={src}
            className={`scene-layer ${i === index % n ? 'active' : ''}`}
            style={{ backgroundImage: `url(${optimizeImg(src, 1600)})` }}
          />
        ))
      )}
      <div className="scene-shade" />
    </div>
  );
}
