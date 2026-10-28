import useScenes from '../hooks/useScenes';
import { optimizeImg } from '../utils/format';

// Photo panel shown beside the login and sign-up forms
export default function AuthArt({ heading, text }) {
  const { scenes } = useScenes();
  const style = scenes[0] ? { backgroundImage: `url(${optimizeImg(scenes[0], 1400)})` } : undefined;
  return (
    <div className={`auth-art ${style ? '' : 'auth-art-aurora'}`} style={style}>
      <div className="auth-art-shade" />
      <div className="auth-art-text">
        <span className="brand fs-2">HotelPro</span>
        <h2 className="mt-4">{heading}</h2>
        <p className="mb-0">{text}</p>
      </div>
    </div>
  );
}
