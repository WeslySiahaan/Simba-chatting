import { auth, provider } from "../firebase-config.js";
import { signInWithPopup } from "firebase/auth";
import Cookies from "universal-cookie";
import "../styles/Auth.css";

const cookies = new Cookies();

export const Auth = ({ setIsAuth }) => {

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      cookies.set("auth-token", result.user.refreshToken);
      setIsAuth(true);
    } catch (err) {
      console.error("Google Sign-In Error:", err);
    }
  };

  return (
    <div className="auth">
      <h1>SELAMAT DATANG DI SIMBA CHATTING</h1>
      <img
        src="/logo.jpg" // Ganti dengan path gambar Anda
        alt="App Logo"
        style={{
          width: "400px", // Ukuran lebar gambar
          height: "400px", // Ukuran tinggi gambar
          display: "block",
          margin: "0 auto 20px auto", // Memusatkan gambar dengan margin bawah
        }}
      />
      <p>Sign in with Google to continue</p>
      <button onClick={signInWithGoogle}>
        Sign In With Google
      </button>
    </div>
  );
};
