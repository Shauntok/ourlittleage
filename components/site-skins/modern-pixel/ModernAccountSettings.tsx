"use client";

import Image from "next/image";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import PixelCornerMarks from "./PixelCornerMarks";
import styles from "./account.module.css";

type Props = {
  email: string;
  currentPassword: string;
  setCurrentPassword: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  saving: boolean;
  message: string;
  onUpdatePassword: () => void;
  onSignOut: () => void;
};

function Artwork({ name, className = "" }: { name: "lock" | "mail" | "logout"; className?: string }) {
  return <Image src={`/images/account-security/${name}.webp`} className={className} width={96} height={96} alt="" aria-hidden="true" />;
}

function PasswordField({ id, label, placeholder, value, onChange, autoComplete }: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return <div className={styles.field}>
    <label htmlFor={id}>{label}</label>
    <div className={styles.inputWrap}>
      <input id={id} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} />
      <button type="button" className={styles.reveal} aria-label={`${visible ? "隐藏" : "显示"}${label}`} aria-pressed={visible} onClick={() => setVisible(!visible)}>
        {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
      </button>
    </div>
  </div>;
}

export default function ModernAccountSettings(props: Props) {
  return <div className={styles.page} data-account-skin="modern_pixel" data-moon-scene>
    <PixelCornerMarks />
    <header className={styles.hero}>
      <PixelCornerMarks />
      <div className={styles.heroCopy}>
        <h1>账号安全</h1>
        <p>守护你的小小世界，让美好的回忆一直都在。</p>
      </div>
    </header>

    <div className={styles.columns}>
      <section className={styles.passwordPanel} aria-labelledby="account-password-title">
        <PixelCornerMarks />
        <div className={styles.panelHeading}>
          <Artwork name="lock" className={styles.lockIcon} />
          <div><h2 id="account-password-title">修改密码</h2><p>修改前需要先确认当前密码。</p></div>
        </div>
        <div className={styles.fields}>
          <PasswordField id="account-current-password" label="当前密码" placeholder="请输入当前密码" value={props.currentPassword} onChange={props.setCurrentPassword} autoComplete="current-password" />
          <PasswordField id="account-new-password" label="新密码（至少 8 个字符）" placeholder="请输入新密码" value={props.newPassword} onChange={props.setNewPassword} autoComplete="new-password" />
          <PasswordField id="account-confirm-password" label="再次输入新密码" placeholder="请再次输入新密码" value={props.confirmPassword} onChange={props.setConfirmPassword} autoComplete="new-password" />
        </div>
        <p className={styles.passwordHint}>密码建议包含字母、数字或符号，至少 8 个字符。</p>
        <button type="button" className={styles.updateButton} onClick={props.onUpdatePassword} disabled={props.saving}>{props.saving ? "更新中..." : "更新密码"}</button>
      </section>

      <div className={styles.rightColumn}>
        <div className={styles.cabinet} role="img" aria-label="木制钥匙柜，里面挂着一把金色钥匙" />
        <section className={styles.emailPanel} aria-labelledby="account-email-title">
          <PixelCornerMarks />
          <Artwork name="mail" className={styles.mailIcon} />
          <div className={styles.emailCopy}>
            <h2 id="account-email-title">登录邮箱</h2>
            <p className={styles.emailValue}>{props.email || "未读取到邮箱"}</p>
            <p className={styles.emailHint}>暂不支持直接更换邮箱。</p>
          </div>
        </section>
        <section className={styles.logoutPanel} aria-labelledby="account-logout-title">
          <PixelCornerMarks />
          <Artwork name="logout" className={styles.logoutIcon} />
          <div className={styles.logoutCopy}>
            <h2 id="account-logout-title">登出账号</h2>
            <p>登出后将从当前设备退出登录。<br />需要重新输入账号和密码才能继续使用。</p>
          </div>
          <button type="button" className={styles.logoutButton} onClick={props.onSignOut}>登出</button>
        </section>
      </div>
    </div>
    {props.message && <p role="status" className={styles.toast}>{props.message}</p>}
  </div>;
}
