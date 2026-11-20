import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useApp } from "./common";
import { registerStudent, signIn } from "./store";

export default function AccountScreen({ signup, onSwitch, onSuccess }) {
  const { t, back } = useApp();
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [created, setCreated] = useState(false);
  const registering = signup && !created;
  const title = registering
    ? t("학생 회원가입", "Create a student account")
    : t("로그인", "Sign in");
  const messages = {
    mismatch: t(
      "두 비밀번호가 일치하지 않아요.",
      "The passwords do not match.",
    ),
    credentials: t(
      "아이디 또는 비밀번호를 확인해 주세요.",
      "Check your username and password.",
    ),
    invalid_signup: t(
      "아이디와 비밀번호의 입력 조건을 확인해 주세요.",
      "Check the username and password requirements.",
    ),
    unavailable_id: t(
      "사용할 수 없는 아이디예요. 다른 아이디를 입력해 주세요.",
      "This username is unavailable. Choose another.",
    ),
    rate_limit: t(
      "잠시 후 다시 시도해 주세요.",
      "Too many attempts. Please try again later.",
    ),
    network: t(
      "인증 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.",
      "The account service is unavailable. Please try again later.",
    ),
  };
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (registering && password !== confirmation) {
      setError("mismatch");
      return;
    }
    setBusy(true);
    try {
      const id = username.trim().toLowerCase();
      if (registering) {
        if (id === "admin") throw new Error("unavailable_id");
        if (new TextEncoder().encode(password).length > 72)
          throw new Error("invalid_signup");
        await registerStudent(id, password);
        setCreated(true);
        setPassword("");
        setConfirmation("");
      } else {
        const user = await signIn(id, password);
        onSuccess(user);
      }
    } catch (e) {
      setError(Object.hasOwn(messages, e.message) ? e.message : "network");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="narrow accountPane">
      <button className="back" onClick={back}>
        <ArrowLeft size={16} />
        {t("뒤로", "Back")}
      </button>
      <form className="formCard" onSubmit={submit}>
        <h1>{title}</h1>
        {created && (
          <p className="noticebox" role="status">
            {t(
              "학생 계정이 만들어졌어요. 비밀번호를 입력해 로그인하세요.",
              "Student account created. Enter your password to sign in.",
            )}
          </p>
        )}
        <label className="formlabel">
          <span>{t("아이디", "Username")}</span>
          <input
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            maxLength={32}
            pattern="[a-zA-Z0-9][a-zA-Z0-9_]{2,31}"
          />
          {registering && (
            <small>
              {t(
                "영문·숫자·밑줄 3~32자. 첫 글자는 영문 또는 숫자예요.",
                "3–32 letters, numbers or underscores. Start with a letter or number.",
              )}
            </small>
          )}
        </label>
        <label className="formlabel">
          <span>{t("비밀번호", "Password")}</span>
          <input
            type="password"
            autoComplete={registering ? "new-password" : "current-password"}
            minLength={registering ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {registering && (
            <small>
              {t(
                "8자 이상, 최대 72바이트",
                "At least 8 characters, up to 72 bytes",
              )}
            </small>
          )}
        </label>
        {registering && (
          <label className="formlabel">
            <span>{t("비밀번호 확인", "Confirm password")}</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </label>
        )}
        {error && (
          <p role="alert" className="errorbanner">
            {messages[error]}
          </p>
        )}
        <button type="submit" className="primary full" disabled={busy}>
          {busy ? t("처리 중…", "Please wait…") : title}
        </button>
        <button
          type="button"
          className="textbtn full"
          disabled={busy}
          onClick={() => {
            setCreated(false);
            setError("");
            setPassword("");
            setConfirmation("");
            onSwitch(!registering);
          }}
        >
          {registering
            ? t("로그인으로 돌아가기", "Back to sign in")
            : t("회원가입", "Create an account")}
        </button>
      </form>
    </main>
  );
}
