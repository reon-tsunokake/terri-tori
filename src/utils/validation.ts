/**
 * バリデーションユーティリティ
 * フォーム入力の検証機能を提供
 */

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * メールアドレスのバリデーション
 */
export const validateEmail = (email: string): ValidationResult => {
  // 空文字チェック
  if (!email.trim()) {
    return {
      isValid: false,
      message: 'メールアドレスを入力してください。'
    };
  }

  // メールアドレスの正規表現
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      message: 'メールアドレスの形式が正しくありません。'
    };
  }

  // 長さチェック（一般的なメールアドレスの上限）
  if (email.length > 254) {
    return {
      isValid: false,
      message: 'メールアドレスが長すぎます。'
    };
  }

  return { isValid: true };
};

/**
 * パスワードのバリデーション
 */
export const validatePassword = (password: string): ValidationResult => {
  // 空文字チェック
  if (!password) {
    return {
      isValid: false,
      message: 'パスワードを入力してください。'
    };
  }

  // 最小文字数チェック
  if (password.length < 6) {
    return {
      isValid: false,
      message: 'パスワードは6文字以上で入力してください。'
    };
  }

  // 最大文字数チェック
  if (password.length > 128) {
    return {
      isValid: false,
      message: 'パスワードは128文字以下で入力してください。'
    };
  }

  // 強度チェック（推奨）
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const strengthCount = [hasLowerCase, hasUpperCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

  // 弱いパスワードの警告（必須ではない）
  if (strengthCount < 2) {
    return {
      isValid: true, // バリデーションは通すが警告を表示
      message: '推奨：大文字、小文字、数字、特殊文字を組み合わせることでセキュリティが向上します。'
    };
  }

  return { isValid: true };
};

/**
 * パスワード確認のバリデーション
 */
export const validatePasswordConfirmation = (password: string, confirmPassword: string): ValidationResult => {
  if (!confirmPassword) {
    return {
      isValid: false,
      message: 'パスワード（確認用）を入力してください。'
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      message: 'パスワードが一致しません。'
    };
  }

  return { isValid: true };
};

/**
 * 表示名のバリデーション
 */
export const validateDisplayName = (displayName: string): ValidationResult => {
  // 空文字は許可（オプショナル）
  if (!displayName.trim()) {
    return { isValid: true };
  }

  // 最小文字数チェック
  if (displayName.trim().length < 1) {
    return {
      isValid: false,
      message: '表示名は1文字以上で入力してください。'
    };
  }

  // 最大文字数チェック
  if (displayName.length > 50) {
    return {
      isValid: false,
      message: '表示名は50文字以下で入力してください。'
    };
  }

  // 禁止文字チェック（例：制御文字）
  const hasInvalidChars = /[\x00-\x1F\x7F]/.test(displayName);
  if (hasInvalidChars) {
    return {
      isValid: false,
      message: '表示名に無効な文字が含まれています。'
    };
  }

  return { isValid: true };
};

/**
 * バイオ（自己紹介）のバリデーション
 */
export const validateBio = (bio: string): ValidationResult => {
  // 空文字は許可
  if (!bio.trim()) {
    return { isValid: true };
  }

  // 最大文字数チェック
  if (bio.length > 500) {
    return {
      isValid: false,
      message: '自己紹介は500文字以下で入力してください。'
    };
  }

  return { isValid: true };
};

/**
 * ウェブサイトURLのバリデーション
 */
export const validateWebsite = (website: string): ValidationResult => {
  // 空文字は許可
  if (!website.trim()) {
    return { isValid: true };
  }

  // URLの正規表現
  const urlRegex = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)$/;
  
  if (!urlRegex.test(website)) {
    return {
      isValid: false,
      message: 'ウェブサイトのURLが正しくありません。http://またはhttps://から始めてください。'
    };
  }

  return { isValid: true };
};

/**
 * 位置情報のバリデーション
 */
export const validateLocation = (location: string): ValidationResult => {
  // 空文字は許可
  if (!location.trim()) {
    return { isValid: true };
  }

  // 最大文字数チェック
  if (location.length > 100) {
    return {
      isValid: false,
      message: '所在地は100文字以下で入力してください。'
    };
  }

  return { isValid: true };
};

/**
 * フォーム全体のバリデーション
 */
export const validateLoginForm = (email: string, password: string): ValidationResult[] => {
  return [
    validateEmail(email),
    validatePassword(password)
  ];
};

export const validateSignUpForm = (
  email: string, 
  password: string, 
  confirmPassword: string, 
  displayName?: string
): ValidationResult[] => {
  const results = [
    validateEmail(email),
    validatePassword(password),
    validatePasswordConfirmation(password, confirmPassword)
  ];

  if (displayName !== undefined) {
    results.push(validateDisplayName(displayName));
  }

  return results;
};

export const validateProfileForm = (
  displayName: string,
  bio: string,
  website: string,
  location: string
): ValidationResult[] => {
  return [
    validateDisplayName(displayName),
    validateBio(bio),
    validateWebsite(website),
    validateLocation(location)
  ];
};