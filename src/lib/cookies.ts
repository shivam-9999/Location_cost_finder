export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
} 