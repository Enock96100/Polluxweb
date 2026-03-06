export default function parseJWT(token) {
  try {
    // Décoder le payload (2ème partie du JWT)
    const base64Payload = token.split(".")[1];
    const payload = JSON.parse(atob(base64Payload));

    const isExpired = payload.exp
      ? Date.now() >= payload.exp * 1000
      : false;

    return {
      data: payload,
      isExpired,
    };
  } catch (e) {
    return { data: null, isExpired: true };
  }
}