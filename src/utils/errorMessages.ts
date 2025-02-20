// errorMessages.ts
export const firebaseErrorMessages: { [key: string]: string } = {
    "auth/invalid-credential": "Credenciais inválidas. Por favor, verifique seu email e senha.",
    "auth/user-not-found": "Usuário não encontrado. Verifique seus dados ou cadastre-se.",
    "auth/wrong-password": "Senha incorreta. Tente novamente.",
    // Outros códigos de erro podem ser mapeados aqui...
};

export function getFriendlyErrorMessage(code: string): string {
    return firebaseErrorMessages[code] || "Ocorreu um erro. Tente novamente mais tarde.";
}