import {
  Camera,
  BadgeCheck,
  Pencil,
  Bell,
  Globe,
  ChevronRight,
  ShieldCheck,
  Lock,
  Fingerprint,
  LogOut,
  User,
  Building2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getAuthData, fetchProfile } from "./auth"; // ⚠️ À CONFIRMER : chemin exact du module auth

const API_BASE_URL = "https://youapi.youneed.app/pollux/dev/api"; // ✅ CONFIRMÉ

// ✅ AJOUTÉ : n'ajoute le champ au FormData que s'il a une valeur non vide.
// Beaucoup de validateurs backend (@IsOptional() combiné à @IsDateString(),
// @IsEmail(), etc.) acceptent l'ABSENCE du champ mais rejettent une chaîne
// vide "". Comme photoFile/logoFile étaient déjà conditionnés correctement,
// on applique la même logique à tous les champs facultatifs pour éviter
// qu'un champ vide (ex: birthDate jamais renseigné) fasse échouer toute la
// requête de mise à jour, même quand seul un AUTRE champ a été modifié.
function appendIfNotEmpty(formData, key, value) {
  if (value !== null && value !== undefined && String(value).trim() !== "") {
    formData.append(key, value);
  }
}

// ✅ AJOUTÉ : extrait un message d'erreur lisible depuis une réponse API en
// erreur, quelle que soit sa forme exacte (message simple, tableau
// d'erreurs de validation, ou objet unique { field, message, type } comme
// celui renvoyé par POST /auth/change-password). Évite d'afficher
// "[object Object]" ou "undefined" à l'utilisateur.
function extractErrorMessage(errorBody, fallback) {
  if (!errorBody) return fallback;
  if (typeof errorBody === "string") return errorBody || fallback;
  if (errorBody.message && typeof errorBody.message === "string") {
    return errorBody.message;
  }
  if (Array.isArray(errorBody.errors) && errorBody.errors.length > 0) {
    return errorBody.errors
      .map((e) => (typeof e === "string" ? e : e?.message))
      .filter(Boolean)
      .join(" ");
  }
  if (errorBody.errors?.message) return errorBody.errors.message;
  // ✅ Cas confirmé par l'API : objet unique { field, message, type }
  if (errorBody.field && errorBody.message) return errorBody.message;
  if (errorBody.error && typeof errorBody.error === "string") return errorBody.error;
  return fallback;
}

/* Ligne d'information simple : libellé + valeur, sans icône devant. */
function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 py-3.5 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-[15px] font-semibold text-gray-900 break-words">
        {value || "-"}
      </span>
    </div>
  );
}

/* Enveloppe de section (carte blanche arrondie avec titre + icône) */
function Section({ icon: Icon, title, action, children }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-200 px-4 sm:px-6 py-5 sm:py-6">
      <div className="flex items-center justify-between mb-1 gap-3">
        <div className="flex items-center gap-2 text-[#1EA4DC] min-w-0">
          <Icon className="w-5 h-5 shrink-0" />
          <h3 className="text-base sm:text-lg font-bold truncate">{title}</h3>
        </div>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
}

// ✅ AJOUTÉ : notification d'erreur homogène (icône + message + bouton
// "Réessayer" optionnel), sur le même modèle que CommissionAd.jsx /
// Detail_com_comm.jsx, pour uniformiser le feedback d'erreur dans toute
// l'application. `onRetry` est facultatif : si absent, le bouton n'est
// pas affiché (ex : erreurs de formulaire dans une modale déjà munie
// d'un bouton "Enregistrer").
function ErrorBanner({ message, onRetry, className = "" }) {
  if (!message) return null;
  return (
    <div
      className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm ${className}`}
    >
      <div className="flex items-start sm:items-center gap-3 flex-1">
        <AlertCircle size={18} className="shrink-0" />
        <span className="flex-1">{message}</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="w-full sm:w-auto bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600 transition-colors shrink-0"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}

// ✅ AJOUTÉ : notification de succès homogène (même gabarit que
// ErrorBanner, en vert) pour confirmer visuellement qu'une mise à jour a
// bien été enregistrée.
function SuccessBanner({ message, className = "" }) {
  if (!message) return null;
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm ${className}`}
    >
      <CheckCircle2 size={18} className="shrink-0" />
      <span className="flex-1">{message}</span>
    </div>
  );
}

// ✅ AJOUTÉ : champ mot de passe partagé pour la modale "Changer le mot de
// passe". Même gabarit que les autres champs du formulaire (label au-dessus,
// input arrondi) — sans icône de cadenas devant le libellé, contrairement à
// la maquette — mais avec l'icône "œil" conservée à droite pour
// afficher/masquer la saisie, comme demandé.
function PasswordField({ label, value, onChange, visible, onToggleVisible, autoComplete }) {
  return (
    <div>
      <label className="text-sm text-gray-500 mb-1 block">{label}</label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]"
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label={visible ? "Masquer" : "Afficher"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function Profile() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ AJOUTÉ : message de succès affiché après une mise à jour réussie
  // (informations personnelles, entreprise ou mot de passe), disparaît
  // automatiquement.
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  // ---- Modal "Informations personnelles" ----
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    city: "",
    country: "",
    birthDate: "",
    photoFile: null,
  });
  const [personalSubmitting, setPersonalSubmitting] = useState(false);
  const [personalError, setPersonalError] = useState(null);

  // ---- Modal "Entreprise" ----
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    description: "",
    isActive: true,
    logoFile: null,
  });
  const [companySubmitting, setCompanySubmitting] = useState(false);
  const [companyError, setCompanyError] = useState(null);

  // ---- Modal "Changer le mot de passe" ----
  // ✅ AJOUTÉ : état du formulaire (mot de passe actuel / nouveau / confirmation),
  // avec un état de visibilité indépendant par champ (comme sur la maquette,
  // chaque champ a sa propre icône "œil").
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordVisibility, setPasswordVisibility] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  const owner = companyData?.owner;

  // Résout dynamiquement le companyId : d'abord via getAuthData(), sinon via fetchProfile()
  const resolveCompanyId = async () => {
    let { companyId } = getAuthData();

    if (!companyId) {
      const profile = await fetchProfile(); // ⚠️ À CONFIRMER : fetchProfile() sans paramètre retourne bien { company: { id } } ?
      if (!profile) throw new Error("Impossible de récupérer le profil");
      companyId = profile?.company?.id;
    }

    if (!companyId) throw new Error("CompanyId manquant");
    return companyId;
  };

  // ✅ CONFIRMÉ : GET /main-companies/:id
  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const { token } = getAuthData();
      if (!token) throw new Error("Token manquant");

      const companyId = await resolveCompanyId();

      const response = await fetch(
        `${API_BASE_URL}/main-companies/${companyId}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur ${response.status} lors du chargement du profil`);
      }

      const result = await response.json();

      if (result.success) {
        setCompanyData(result.data);
      } else {
        throw new Error("Échec de la récupération des données du profil");
      }
    } catch (err) {
      setError(err.message || "Impossible de charger le profil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // ⚠️ À CONFIRMER : mécanisme de déconnexion exact (existe-t-il une fonction logout dans ./auth ?)
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("companyId");
    window.location.href = "/login";
  };

  const openPersonalModal = () => {
    setPersonalError(null);
    setPersonalForm({
      firstName: owner?.firstName || "",
      lastName: owner?.lastName || "",
      phone: owner?.phone || "",
      city: owner?.city || "",
      country: owner?.country || "",
      birthDate: owner?.birthDate ? owner.birthDate.slice(0, 10) : "",
      photoFile: null,
    });
    setShowPersonalModal(true);
  };

  const openCompanyModal = () => {
    setCompanyError(null);
    setCompanyForm({
      name: companyData?.name || "",
      email: companyData?.email || "",
      phone: companyData?.phone || "",
      address: companyData?.address || "",
      description: companyData?.description || "",
      isActive: companyData?.isActive ?? true,
      logoFile: null,
    });
    setShowCompanyModal(true);
  };

  // ✅ AJOUTÉ : ouverture de la modale "Changer le mot de passe" — réinitialise
  // systématiquement le formulaire et les erreurs pour ne jamais réafficher
  // une saisie ou une erreur d'une précédente tentative.
  const openPasswordModal = () => {
    setPasswordError(null);
    setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordVisibility({ oldPassword: false, newPassword: false, confirmPassword: false });
    setShowPasswordModal(true);
  };

  const togglePasswordVisibility = (field) => {
    setPasswordVisibility((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // ✅ CONFIRMÉ : PUT /auth/profile (multipart/form-data)
  // ✅ CORRIGÉ : les champs optionnels (phone, city, country, birthDate)
  // n'étaient auparavant JAMAIS omis du FormData même quand ils étaient
  // vides ("") — ce qui faisait échouer la validation côté backend (un
  // champ optionnel accepte l'absence de valeur, pas une chaîne vide,
  // typiquement pour birthDate en format date). Résultat : la mise à jour
  // échouait systématiquement dès que l'un de ces champs n'était pas
  // renseigné, même si seul un autre champ (ex: firstName) avait été
  // modifié. On utilise désormais appendIfNotEmpty() pour ces champs.
  const handlePersonalUpdate = async (e) => {
    e.preventDefault();
    setPersonalSubmitting(true);
    setPersonalError(null);
    try {
      const { token } = getAuthData();
      if (!token) throw new Error("Token manquant");

      const formData = new FormData();
      // Champs obligatoires : toujours envoyés
      formData.append("firstName", personalForm.firstName);
      formData.append("lastName", personalForm.lastName);
      // Champs optionnels : envoyés uniquement s'ils ont une valeur
      appendIfNotEmpty(formData, "phone", personalForm.phone);
      appendIfNotEmpty(formData, "city", personalForm.city);
      appendIfNotEmpty(formData, "country", personalForm.country);
      appendIfNotEmpty(formData, "birthDate", personalForm.birthDate);
      if (personalForm.photoFile) {
        formData.append("photo", personalForm.photoFile);
      }

      // 🔍 DEBUG : contenu envoyé au serveur
      console.log("[PUT /auth/profile] payload envoyé :");
      for (const [key, value] of formData.entries()) {
        console.log(" -", key, ":", value);
      }

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
          // Ne pas définir Content-Type manuellement : le navigateur ajoute la boundary multipart automatiquement
        },
        body: formData,
      });

      if (!response.ok) {
        let errorBody = null;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text().catch(() => null);
        }
        console.error(
          `[PUT /auth/profile] Erreur ${response.status} :`,
          JSON.stringify(errorBody, null, 2)
        );
        throw new Error(
          extractErrorMessage(errorBody, `Erreur ${response.status} lors de la mise à jour`)
        );
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error("Échec de la mise à jour des informations personnelles");
      }

      setShowPersonalModal(false);
      setSuccessMessage("Informations personnelles mises à jour avec succès.");
      await loadProfile();
    } catch (err) {
      setPersonalError(err.message || "Impossible de mettre à jour le profil");
    } finally {
      setPersonalSubmitting(false);
    }
  };

  // ✅ CONFIRMÉ : PUT /main-companies/:id
  //
  // 🐛 BUG BACKEND IDENTIFIÉ (2026-08-13) : quand la requête est envoyée en
  // multipart/form-data, le champ `isActive` arrive côté serveur comme une
  // CHAÎNE ("true"/"false"), puisque FormData ne transporte que des
  // chaînes. Le service `main_company.service.ts` (ligne ~212) transmet
  // cette chaîne telle quelle à `prisma.mainCompany.update()`, qui attend
  // un vrai booléen → PrismaClientValidationError → 500 :
  //   "Argument `isActive`: Invalid value provided. Expected Boolean or
  //   BoolFieldUpdateOperationsInput, provided String."
  // Le fix propre est côté backend (caster isActive en boolean avant
  // l'update, ou @Transform sur le DTO). EN ATTENDANT ce fix, on contourne
  // le problème ici : si aucun logo n'est envoyé, on utilise du JSON
  // classique (Content-Type: application/json) au lieu du multipart, ce
  // qui préserve le vrai type booléen de `isActive`. Si un logo EST
  // envoyé, on est obligés de repasser en multipart (upload de fichier
  // oblige) et le bug reviendra tant que le backend n'est pas corrigé.
  const handleCompanyUpdate = async (e) => {
    e.preventDefault();
    setCompanySubmitting(true);
    setCompanyError(null);
    try {
      const { token } = getAuthData();
      if (!token) throw new Error("Token manquant");

      const companyId = await resolveCompanyId();

      let response;

      if (companyForm.logoFile) {
        // Un logo est fourni : upload de fichier obligatoire -> multipart.
        // ⚠️ Le bug `isActive` (voir commentaire ci-dessus) peut se
        // reproduire ici tant que le backend n'est pas corrigé.
        const formData = new FormData();
        formData.append("name", companyForm.name);
        formData.append("email", companyForm.email);
        appendIfNotEmpty(formData, "phone", companyForm.phone);
        appendIfNotEmpty(formData, "address", companyForm.address);
        appendIfNotEmpty(formData, "description", companyForm.description);
        formData.append("isActive", companyForm.isActive ? "true" : "false");
        formData.append("logo", companyForm.logoFile);

        // 🔍 DEBUG : contenu envoyé au serveur
        console.log(`[PUT /main-companies/${companyId}] payload envoyé (multipart) :`);
        for (const [key, value] of formData.entries()) {
          console.log(" -", key, ":", value);
        }

        response = await fetch(`${API_BASE_URL}/main-companies/${companyId}`, {
          method: "PUT",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
            // Ne pas définir Content-Type manuellement : le navigateur ajoute la boundary multipart automatiquement
          },
          body: formData,
        });
      } else {
        // Pas de logo à uploader : on envoie du JSON pour préserver le
        // vrai type booléen de isActive et éviter le bug backend.
        const payload = {
          name: companyForm.name,
          email: companyForm.email,
          isActive: companyForm.isActive,
        };
        if (companyForm.phone?.trim()) payload.phone = companyForm.phone;
        if (companyForm.address?.trim()) payload.address = companyForm.address;
        if (companyForm.description?.trim()) payload.description = companyForm.description;

        // 🔍 DEBUG : contenu envoyé au serveur
        console.log(`[PUT /main-companies/${companyId}] payload envoyé (JSON) :`, payload);

        response = await fetch(`${API_BASE_URL}/main-companies/${companyId}`, {
          method: "PUT",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        let errorBody = null;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text().catch(() => null);
        }
        console.error(
          `[PUT /main-companies/${companyId}] Erreur ${response.status} :`,
          JSON.stringify(errorBody, null, 2)
        );
        throw new Error(
          extractErrorMessage(errorBody, `Erreur ${response.status} lors de la mise à jour`)
        );
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error("Échec de la mise à jour de l'entreprise");
      }

      setShowCompanyModal(false);
      setSuccessMessage("Informations de l'entreprise mises à jour avec succès.");
      await loadProfile();
    } catch (err) {
      setCompanyError(err.message || "Impossible de mettre à jour l'entreprise");
    } finally {
      setCompanySubmitting(false);
    }
  };

  // ✅ CONFIRMÉ (curl testé) : POST /auth/change-password (JSON, pas
  // multipart) attend { "oldPassword": "string", "newPassword": "string" }.
  // ✅ CORRIGÉ / AJOUTÉ :
  //   - Validation cliente AVANT l'appel réseau : le backend rejette tout
  //     newPassword de moins de 8 caractères (confirmé par l'erreur
  //     { field: "newPassword", message: "Le nouveau mot de passe doit
  //     contenir au moins 8 caractères", type: "string.min" }) — on
  //     reproduit ce message côté UI pour ne pas dépendre d'un aller-retour
  //     réseau pour un cas aussi simple à détecter localement.
  //   - Vérification que "confirmPassword" correspond bien à "newPassword"
  //     avant d'envoyer la requête (le champ confirmPassword n'existe pas
  //     côté API : il ne sert qu'à sécuriser la saisie côté UI et n'est
  //     jamais envoyé dans le body).
  //   - Les erreurs API sont normalisées via extractErrorMessage() pour
  //     gérer aussi bien un message simple qu'un objet unique
  //     { field, message, type } comme celui renvoyé par cet endpoint.
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);

    if (!passwordForm.oldPassword) {
      setPasswordError("Veuillez saisir votre mot de passe actuel.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setPasswordSubmitting(true);
    try {
      const { token } = getAuthData();
      if (!token) throw new Error("Token manquant");

      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!response.ok) {
        let errorBody = null;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text().catch(() => null);
        }
        console.error(
          `[POST /auth/change-password] Erreur ${response.status} :`,
          JSON.stringify(errorBody, null, 2)
        );
        throw new Error(
          extractErrorMessage(errorBody, `Erreur ${response.status} lors du changement de mot de passe`)
        );
      }

      // ⚠️ À CONFIRMER : la réponse suit-elle le même gabarit { success, data }
      // que les autres endpoints ? On reste tolérant si "success" est absent.
      const result = await response.json().catch(() => null);
      if (result && result.success === false) {
        throw new Error(extractErrorMessage(result, "Échec du changement de mot de passe"));
      }

      setShowPasswordModal(false);
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setSuccessMessage("Mot de passe modifié avec succès.");
    } catch (err) {
      setPasswordError(err.message || "Impossible de changer le mot de passe");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const fullName =
    [owner?.firstName, owner?.lastName].filter(Boolean).join(" ") ||
    "Utilisateur";

  const getInitials = () => {
    const first = owner?.firstName?.[0] || "";
    const last = owner?.lastName?.[0] || "";
    if (!first && !last) return "U";
    return (first + last).toUpperCase();
  };

  // ⚠️ À CONFIRMER : basé sur la création de l'entreprise, à ajuster si besoin
  const memberSince = companyData?.createdAt
    ? new Date(companyData.createdAt).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      })
    : "-";

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="flex items-center gap-2 text-gray-500 text-sm sm:text-base">
          <Loader2 className="w-5 h-5 animate-spin text-[#1EA4DC]" />
          <span>Chargement du profil...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 bg-[#F8FAFC] min-h-screen">
      {/* ================= HEADER DE PAGE ================= */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-[#111827]">Profil</h1>
        <p className="text-gray-500 text-sm sm:text-base">
          Gérez vos informations personnelles et celles de votre entreprise
        </p>
      </div>

      {/* ✅ CORRIGÉ : notification homogène (icône + bouton Réessayer),
          alignée sur le modèle utilisé dans CommissionAd.jsx /
          Detail_com_comm.jsx. Le bouton relance loadProfile(). */}
      <ErrorBanner message={error} onRetry={loadProfile} />
      <SuccessBanner message={successMessage} />

      {/* ================= CONTENU PRINCIPAL (pleine largeur) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
        {/* ---------- Colonne gauche : carte identité + sécurité + déconnexion ---------- */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          {/* Carte d'en-tête avec dégradé */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#123B8A] via-[#1560B8] to-[#1EA4DC] px-6 py-8 sm:py-10 text-center shadow-lg">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/15 border border-white/30 backdrop-blur-sm flex items-center justify-center">
                <span className="text-3xl sm:text-4xl font-bold text-white tracking-wide">
                  {getInitials()}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {}}
                className="absolute bottom-0 right-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white flex items-center justify-center shadow-md"
                aria-label="Changer la photo de profil"
              >
                <Camera className="w-4 h-4 text-emerald-500" />
              </button>
            </div>

            <h2 className="mt-5 text-xl sm:text-2xl font-bold text-white break-words">{fullName}</h2>
            <p className="mt-1 text-white/70 text-sm break-words">
              {companyData?.name || "Entreprise Principale"}
            </p>

            <span className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold text-white bg-white/15 border border-white/25">
              <BadgeCheck className="w-4 h-4" />
              Compte Vérifié
            </span>

            <p className="mt-4 text-white/60 text-xs">
              Membre depuis {memberSince}
            </p>
          </div>

          {/* Sécurité */}
          <section className="bg-white rounded-2xl border border-gray-200 px-4 sm:px-6 py-5 sm:py-6">
            <div className="flex items-center gap-2 text-[#1EA4DC] mb-3">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-base sm:text-lg font-bold">Sécurité</h3>
            </div>

            {/* ✅ CORRIGÉ : ouvre désormais la modale "Changer le mot de
                passe" (auparavant onClick={() => {}}, sans effet). */}
            <button
              type="button"
              onClick={openPasswordModal}
              className="w-full flex items-center justify-between py-3.5 border-b border-gray-100"
            >
              <div className="flex items-center gap-3 text-gray-900 min-w-0">
                <Lock className="w-5 h-5 text-[#1EA4DC] shrink-0" />
                <span className="font-semibold text-sm sm:text-base truncate">Modifier mot de passe</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => {}}
              className="w-full flex items-center justify-between py-3.5"
            >
              <div className="flex items-center gap-3 text-gray-900 min-w-0">
                <Fingerprint className="w-5 h-5 text-[#1EA4DC] shrink-0" />
                <span className="font-semibold text-sm sm:text-base truncate">
                  Authentification biométrique
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </button>
          </section>

          {/* Déconnexion - seul bouton fonctionnel de la page */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-2xl border border-red-200 bg-red-50 text-red-500 font-semibold hover:bg-red-100 transition-colors text-sm sm:text-base"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>

        {/* ---------- Colonne droite : informations, entreprise, préférences ---------- */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Informations personnelles */}
          <Section
            icon={User}
            title="Informations personnelles"
            action={
              <button
                type="button"
                onClick={openPersonalModal}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 shrink-0"
                aria-label="Modifier les informations personnelles"
              >
                <Pencil className="w-4 h-4" />
              </button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow label="Nom complet" value={fullName} />
              <InfoRow label="Email" value={owner?.email} />
              <InfoRow label="Téléphone" value={owner?.phone} />
              <InfoRow label="Ville" value={owner?.city} />
              <InfoRow label="Pays" value={owner?.country} />
            </div>
          </Section>

          {/* Entreprise */}
          <Section
            icon={Building2}
            title="Entreprise"
            action={
              <button
                type="button"
                onClick={openCompanyModal}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 shrink-0"
                aria-label="Modifier l'entreprise"
              >
                <Pencil className="w-4 h-4" />
              </button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <InfoRow label="Nom" value={companyData?.name} />
              <InfoRow label="Email" value={companyData?.email} />
              <InfoRow label="Téléphone" value={companyData?.phone} />
              <InfoRow label="Adresse" value={companyData?.address} />
            </div>
            <InfoRow
              label="Description"
              value={companyData?.description}
            />
            <div className="flex flex-col gap-0.5 py-3.5">
              <span className="text-sm text-gray-400">Statut</span>
              <span
                className={`inline-flex items-center gap-1.5 text-[15px] font-semibold ${
                  companyData?.isActive ? "text-emerald-500" : "text-red-500"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    companyData?.isActive ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
                {companyData?.isActive ? "Actif" : "Inactif"}
              </span>
            </div>
          </Section>

          {/* Préférences */}
          <section className="bg-white rounded-2xl border border-gray-200 px-4 sm:px-6 py-5 sm:py-6">
            <div className="flex items-center gap-2 text-[#1EA4DC] mb-3">
              <Globe className="w-5 h-5" />
              <h3 className="text-base sm:text-lg font-bold">Préférences</h3>
            </div>

            <div className="flex items-center justify-between gap-3 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3 text-gray-700 min-w-0">
                <Bell className="w-5 h-5 text-gray-400 shrink-0" />
                <span className="font-medium text-sm sm:text-base truncate">Push Notifications</span>
              </div>

              <button
                type="button"
                onClick={() => setPushNotifications((prev) => !prev)}
                className={`w-12 h-7 rounded-full flex items-center px-0.5 transition-colors shrink-0 ${
                  pushNotifications ? "bg-[#1EA4DC]" : "bg-gray-200"
                }`}
                aria-pressed={pushNotifications}
                aria-label="Activer les notifications push"
              >
                <span
                  className={`w-6 h-6 rounded-full bg-white shadow transform transition-transform ${
                    pushNotifications ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {}}
              className="w-full flex items-center justify-between gap-3 py-3.5 mt-1"
            >
              <div className="flex items-center gap-3 text-gray-900 min-w-0">
                <Globe className="w-5 h-5 text-[#1EA4DC] shrink-0" />
                <span className="font-semibold text-sm sm:text-base truncate">Langue</span>
              </div>
              <span className="text-gray-400 text-sm sm:text-base shrink-0">Français</span>
            </button>
          </section>
        </div>
      </div>

      {/* ================= MODAL : Informations personnelles ================= */}
      {showPersonalModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
              Modifier mes informations personnelles
            </h3>

            {/* ✅ CORRIGÉ : même gabarit de notification que partout ailleurs */}
            <ErrorBanner message={personalError} className="mb-4" />

            <form onSubmit={handlePersonalUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={personalForm.firstName}
                    onChange={(e) =>
                      setPersonalForm((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={personalForm.lastName}
                    onChange={(e) =>
                      setPersonalForm((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    value={personalForm.phone}
                    onChange={(e) =>
                      setPersonalForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={personalForm.city}
                    onChange={(e) =>
                      setPersonalForm((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">
                    Pays
                  </label>
                  <input
                    type="text"
                    value={personalForm.country}
                    onChange={(e) =>
                      setPersonalForm((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={personalForm.birthDate}
                    onChange={(e) =>
                      setPersonalForm((prev) => ({
                        ...prev,
                        birthDate: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500 mb-1 block">
                  Photo de profil
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setPersonalForm((prev) => ({
                      ...prev,
                      photoFile: e.target.files?.[0] || null,
                    }))
                  }
                  className="w-full text-sm text-gray-600"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPersonalModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={personalSubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#1EA4DC] text-sm font-medium text-white hover:bg-[#1893c6] disabled:opacity-60"
                >
                  {personalSubmitting ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL : Entreprise ================= */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
              Modifier les informations de l'entreprise
            </h3>

            {/* ✅ CORRIGÉ : même gabarit de notification que partout ailleurs */}
            <ErrorBanner message={companyError} className="mb-4" />

            <form onSubmit={handleCompanyUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">
                    Nom
                  </label>
                  <input
                    type="text"
                    value={companyForm.name}
                    onChange={(e) =>
                      setCompanyForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">
                    Email
                  </label>
                  <input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) =>
                      setCompanyForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">
                    Téléphone
                  </label>
                  <input
                    type="text"
                    value={companyForm.phone}
                    onChange={(e) =>
                      setCompanyForm((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={companyForm.address}
                    onChange={(e) =>
                      setCompanyForm((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-500 mb-1 block">
                  Description
                </label>
                <textarea
                  value={companyForm.description}
                  onChange={(e) =>
                    setCompanyForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1EA4DC]"
                />
              </div>

              <div>
                <label className="text-sm text-gray-500 mb-1 block">
                  Logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setCompanyForm((prev) => ({
                      ...prev,
                      logoFile: e.target.files?.[0] || null,
                    }))
                  }
                  className="w-full text-sm text-gray-600"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setCompanyForm((prev) => ({
                      ...prev,
                      isActive: !prev.isActive,
                    }))
                  }
                  className={`w-12 h-7 rounded-full flex items-center px-0.5 transition-colors shrink-0 ${
                    companyForm.isActive ? "bg-[#1EA4DC]" : "bg-gray-200"
                  }`}
                  aria-pressed={companyForm.isActive}
                >
                  <span
                    className={`w-6 h-6 rounded-full bg-white shadow transform transition-transform ${
                      companyForm.isActive ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  Entreprise active
                </span>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompanyModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={companySubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#1EA4DC] text-sm font-medium text-white hover:bg-[#1893c6] disabled:opacity-60"
                >
                  {companySubmitting ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL : Changer le mot de passe ================= */}
      {/* ✅ AJOUTÉ : formulaire déclenché par "Modifier mot de passe" dans la
          section Sécurité. Même gabarit que les autres modales (fond
          assombri, carte blanche arrondie, notification d'erreur en haut,
          boutons Annuler / valider en bas) — sans icône de cadenas devant
          chaque libellé, mais avec l'icône "œil" conservée sur chaque champ
          pour afficher/masquer la saisie. Appelle POST /auth/change-password
          avec { oldPassword, newPassword }. */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">
              Changer le mot de passe
            </h3>

            <ErrorBanner message={passwordError} className="mb-4" />

            <form onSubmit={handleChangePassword} className="space-y-4">
              <PasswordField
                label="Mot de passe actuel"
                value={passwordForm.oldPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))
                }
                visible={passwordVisibility.oldPassword}
                onToggleVisible={() => togglePasswordVisibility("oldPassword")}
                autoComplete="current-password"
              />

              <PasswordField
                label="Nouveau mot de passe"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                }
                visible={passwordVisibility.newPassword}
                onToggleVisible={() => togglePasswordVisibility("newPassword")}
                autoComplete="new-password"
              />

              <PasswordField
                label="Confirmer le mot de passe"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                }
                visible={passwordVisibility.confirmPassword}
                onToggleVisible={() => togglePasswordVisibility("confirmPassword")}
                autoComplete="new-password"
              />

              <p className="text-gray-400 text-xs">
                Le nouveau mot de passe doit contenir au moins 8 caractères.
              </p>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={passwordSubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1EA4DC] text-sm font-medium text-white hover:bg-[#1893c6] disabled:opacity-60"
                >
                  {passwordSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {passwordSubmitting ? "Modification..." : "Changer le mot de passe"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}