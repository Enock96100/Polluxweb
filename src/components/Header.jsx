import {
  Bell,
  ChevronDown,
  LogOut,
  User,
  Wallet,
  BadgeCheck,
  MoreVertical,
  CheckCheck,
  Trash2,
  Clock,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import useAuth from "../context/auth/utils";

// -----------------------------------------------------------------------
// Config API
// -----------------------------------------------------------------------
const API_BASE = "https://youapi.youneed.app/pollux/prod/api";
const PAGE_LIMIT = 20;

// ⚠️ Adapte cette fonction si tu as déjà un utilitaire getAuthData()/getToken()
// centralisé ailleurs dans le projet — remplace simplement le corps par
// return getAuthData()?.token; pour rester cohérent avec le reste de l'app.
function getToken() {
  try {
    const raw = localStorage.getItem("authData");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.token) return parsed.token;
      if (parsed?.accessToken) return parsed.accessToken;
    }
  } catch {
    // ignore parsing errors
  }
  return (
    localStorage.getItem("token") || localStorage.getItem("accessToken") || null
  );
}

const notificationsApi = axios.create({ baseURL: API_BASE });

notificationsApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// -----------------------------------------------------------------------
// Appels API
// -----------------------------------------------------------------------
async function apiFetchNotifications({ page = 1, limit = PAGE_LIMIT, unreadOnly = false }) {
  const { data } = await notificationsApi.get("/notifications/user", {
    params: { page, limit, unreadOnly },
  });
  return data; // { success, data: [...], pagination: {...} }
}

async function apiFetchUnreadCount() {
  const { data } = await notificationsApi.get("/notifications/user/unread-count");
  return data?.unreadCount ?? 0;
}

async function apiMarkAllRead() {
  const { data } = await notificationsApi.patch("/notifications/user/read-all");
  return data; // { success, data: { count } }
}

async function apiDeleteAll() {
  const { data } = await notificationsApi.delete("/notifications/user");
  return data; // { success, deleted }
}

async function apiFetchNotificationById(id) {
  const { data } = await notificationsApi.get(`/notifications/${id}`);
  return data?.data;
}

// -----------------------------------------------------------------------
// Helpers d'affichage — notifications
// -----------------------------------------------------------------------
const OPERATION_TYPE_LABELS = {
  CANAL_SUBSCRIPTION_NEW: "Nouvel abonnement Canal+",
  CANAL_SUBSCRIPTION_RENEWAL: "Renouvellement Canal+",
  CANAL_SUBSCRIPTION_FORMULA_CHANGE: "Changement de formule",
  CANAL_SUBSCRIPTION_REACTIVATION: "Réactivation Canal+",
  PREPAID_CARD_ACTIVATION: "Activation carte",
  PREPAID_CARD_RECHARGE: "Recharge carte",
  SUBPRODUCT_RESTOCKING: "Approvisionnement",
  RESTOCKING: "Approvisionnement",
  COMMISSION_WITHDRAWAL: "Retrait de commission",
  WALLET_DEPOSIT: "Dépôt portefeuille",
};

function getOperationLabel(notification) {
  const opType = notification?.metadata?.operationType;
  return OPERATION_TYPE_LABELS[opType] || notification?.type || "Notification";
}

function getTypeStyle(notification) {
  const opType = notification?.metadata?.operationType;
  if (opType?.startsWith("CANAL_SUBSCRIPTION")) {
    return { bg: "bg-[#1EA4DC]/10", text: "text-[#1EA4DC]" };
  }
  if (opType?.startsWith("PREPAID_CARD")) {
    return { bg: "bg-amber-50", text: "text-amber-600" };
  }
  if (opType === "RESTOCKING" || opType === "SUBPRODUCT_RESTOCKING") {
    return { bg: "bg-purple-50", text: "text-purple-600" };
  }
  if (opType === "COMMISSION_WITHDRAWAL" || opType === "WALLET_DEPOSIT") {
    return { bg: "bg-emerald-50", text: "text-emerald-600" };
  }
  return { bg: "bg-amber-50", text: "text-amber-500" };
}

function formatRelativeDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `${diffMin} min`;
  if (diffH < 24) return `${diffH} h`;
  if (diffD < 7) return `${diffD} j`;

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFullDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// -----------------------------------------------------------------------
// Helpers d'affichage — type d'opérateur connecté
// -----------------------------------------------------------------------
// ✅ CONFIRMÉ : valeurs "userType" observées dans l'API (mêmes valeurs que
// OPERATOR_TYPE_MAP utilisé dans Detail_operateur.jsx pour /pin/reset et /pin/unlock).
const OPERATOR_TYPE_LABELS = {
  MAIN_COMPANY: "Compagnie",
  ADMIN_AGENT: "Agent",
  DISTRIBUTOR: "Distributeur",
  MERCHANT: "Commerçant",
};

/**
 * Construit le libellé à afficher dans le header :
 *  - MAIN_COMPANY -> "COMPAGNIE"            (sans nom : déjà affiché à côté)
 *  - ADMIN_AGENT  -> "AGENT"                (sans nom : déjà affiché à côté)
 *  - DISTRIBUTOR  -> "DISTRIBUTEUR : ENOCK ABOU"
 *  - MERCHANT     -> "COMMERÇANT : JEANNE HOUNKPATIN"
 */
function getOperatorTypeLabel(userInfo) {
  const userType = userInfo?.userType || userInfo?.user?.userType;
  const typeLabel = OPERATOR_TYPE_LABELS[userType];
  if (!typeLabel) return null; // type inconnu/non chargé : on n'affiche rien plutôt qu'un libellé faux

  // Compagnie et Agent : uniquement le type, le nom et l'email sont déjà
  // affichés dans le bloc profil.
  if (userType === "MAIN_COMPANY" || userType === "ADMIN_AGENT") {
    return typeLabel.toUpperCase();
  }

  const fullName = [userInfo?.firstName, userInfo?.lastName].filter(Boolean).join(" ");

  return `${typeLabel.toUpperCase()} : ${(fullName || "Utilisateur").toUpperCase()}`;
}

// -----------------------------------------------------------------------
// Composant : Carte de notification
// -----------------------------------------------------------------------
function NotificationItem({ notification, onClick }) {
  const style = getTypeStyle(notification);

  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      className={`group w-full text-left flex gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-2xl transition-colors border ${
        !notification.isRead
          ? "bg-[#EEF5FF] border-[#1EA4DC]/10 hover:bg-[#E2EFFC]"
          : "bg-white border-transparent hover:bg-gray-50"
      }`}
    >
      <span
        className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex-shrink-0 ${style.bg} ${style.text}`}
      >
        <Clock size={18} />
      </span>

      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate">
            {notification.title}
          </span>
          {!notification.isRead && (
            <span className="w-2 h-2 rounded-full bg-[#1EA4DC] flex-shrink-0" />
          )}
        </span>

        <span className="block text-xs text-gray-500 mt-0.5 line-clamp-2 leading-snug">
          {notification.message}
        </span>

        <span className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <Clock size={11} />
            {formatRelativeDate(notification.createdAt)}
          </span>
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}
          >
            {getOperationLabel(notification)}
          </span>
        </span>
      </span>
    </button>
  );
}

// -----------------------------------------------------------------------
// Composant : Modale de détail d'une notification
// -----------------------------------------------------------------------
function NotificationDetailModal({ notification, loading, onClose }) {
  if (!notification && !loading) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-3 sm:px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={26} className="animate-spin text-[#1EA4DC]" />
            <p className="text-sm text-gray-400">Chargement de la notification…</p>
          </div>
        ) : (
          <>
            {/* En-tête bleu */}
            <div className="bg-gradient-to-r from-[#1EA4DC] to-[#0B2A6B] px-4 sm:px-6 py-4 sm:py-5 flex items-start gap-3 sm:gap-4">
              <span className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/15 text-white flex-shrink-0">
                <Clock size={20} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-white/80">
                  {getOperationLabel(notification)}
                </p>
                <p className="text-base sm:text-lg font-semibold text-white leading-snug">
                  {notification.title}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Corps */}
            <div className="px-4 sm:px-6 py-4 sm:py-5">
              <p className="text-sm text-gray-700 leading-relaxed">
                {notification.message}
              </p>

              {notification.metadata && (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
                  {notification.metadata.amount !== undefined && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                        Montant
                      </p>
                      <p className="text-sm font-semibold text-gray-800">
                        {Number(notification.metadata.amount).toLocaleString("fr-FR")}{" "}
                        FCFA
                      </p>
                    </div>
                  )}
                  {(notification.metadata.submittedBy ||
                    notification.metadata.requesterName) && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                        Soumis par
                      </p>
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {notification.metadata.submittedBy ||
                          notification.metadata.requesterName}
                      </p>
                    </div>
                  )}
                  {notification.metadata.subProductName && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                        Produit
                      </p>
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {notification.metadata.subProductName}
                      </p>
                    </div>
                  )}
                  {notification.metadata.quantity !== undefined && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">
                        Quantité
                      </p>
                      <p className="text-sm font-semibold text-gray-800">
                        {notification.metadata.quantity}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1.5 mt-4 text-xs text-gray-400">
                <Clock size={13} />
                {formatFullDate(notification.createdAt)}
              </div>
            </div>

            {/* Pied */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-[#1EA4DC] hover:bg-[#1EA4DC]/10 transition-colors"
              >
                Fermer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------
// Composant principal : Header
// -----------------------------------------------------------------------
export default function Header() {
  const [openMenu, setOpenMenu] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);
  const [openNotifOptions, setOpenNotifOptions] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [activeTab, setActiveTab] = useState("tout"); // "tout" | "non-lu"
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);

  const [selectedNotif, setSelectedNotif] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const { logout, userInfo } = useAuth();
  const navigate = useNavigate();

  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const hasLoadedOnce = useRef(false);

  const operatorTypeLabel = getOperatorTypeLabel(userInfo);

  // Le menu "Mes permissions" n'est visible que pour les Agents.
  // La Compagnie a déjà la main sur tout, elle n'en a pas besoin.
  const isAgent = (userInfo?.userType || userInfo?.user?.userType) === "ADMIN_AGENT";

  // ---------------------------------------------------------------------
  // Chargement du compteur de non-lus (indépendant du panneau)
  // ---------------------------------------------------------------------
  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await apiFetchUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      // silencieux : le badge reste tel quel en cas d'échec réseau
      console.error("Erreur récupération unread-count :", err);
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // ---------------------------------------------------------------------
  // Chargement de la liste (page 1, remplace)
  // ---------------------------------------------------------------------
  const loadNotifications = useCallback(async (tab) => {
    setLoadingList(true);
    setListError(null);
    try {
      const res = await apiFetchNotifications({
        page: 1,
        limit: PAGE_LIMIT,
        unreadOnly: tab === "non-lu",
      });
      setNotifications(res.data || []);
      setPage(1);
      setTotalPages(res.pagination?.totalPages || 1);
      hasLoadedOnce.current = true;
    } catch (err) {
      console.error("Erreur récupération notifications :", err);
      setListError("Impossible de charger les notifications.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Charge à la première ouverture du panneau
  useEffect(() => {
    if (openNotif && !hasLoadedOnce.current) {
      loadNotifications(activeTab);
    }
  }, [openNotif, activeTab, loadNotifications]);

  // Recharge quand on change de tab (une fois déjà ouvert au moins une fois)
  useEffect(() => {
    if (openNotif && hasLoadedOnce.current) {
      loadNotifications(activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ---------------------------------------------------------------------
  // Pagination "Charger plus"
  // ---------------------------------------------------------------------
  const handleLoadMore = async () => {
    if (page >= totalPages || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await apiFetchNotifications({
        page: nextPage,
        limit: PAGE_LIMIT,
        unreadOnly: activeTab === "non-lu",
      });
      setNotifications((prev) => [...prev, ...(res.data || [])]);
      setPage(nextPage);
      setTotalPages(res.pagination?.totalPages || totalPages);
    } catch (err) {
      console.error("Erreur pagination notifications :", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // ---------------------------------------------------------------------
  // Fermeture au clic extérieur
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!openMenu && !openNotif) return;

    const handleClickOutside = (event) => {
      if (
        openMenu &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpenMenu(false);
      }
      if (
        openNotif &&
        notifRef.current &&
        !notifRef.current.contains(event.target)
      ) {
        setOpenNotif(false);
        setOpenNotifOptions(false);
        setConfirmingDelete(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenu, openNotif]);

  const getInitials = () => {
    const first = userInfo?.firstName?.[0] || "";
    const last = userInfo?.lastName?.[0] || "";

    if (!first && !last) return "U";

    return (first + last).toUpperCase();
  };

  const handleLogout = () => {
    setOpenMenu(false);
    logout();
  };

  // Navigation vers la page Profil
  //  CONFIRMÉ : route "/profil" -> <Profil />
  const handleGoToProfile = () => {
    setOpenMenu(false);
    navigate("/profil");
  };

  // Navigation vers la page Commissions
  //  CONFIRMÉ : route "/commissions_ad" -> <Commissions_ad />
  const handleGoToCommissions = () => {
    setOpenMenu(false);
    navigate("/commission_ad");
  };

  // Navigation vers la page Mes permissions (Agent uniquement)
  //  CONFIRMÉ : route "/Mes_permissions" -> <Mes_permissions />
  const handleGoToPermissions = () => {
    setOpenMenu(false);
    navigate("/Mes_permissions");
  };

  // ---------------------------------------------------------------------
  // Actions : marquer tout lu / tout supprimer
  // ---------------------------------------------------------------------
  const handleMarkAllAsRead = async () => {
    setActionLoading(true);
    try {
      await apiMarkAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
      setOpenNotifOptions(false);
    } catch (err) {
      console.error("Erreur marquer tout comme lu :", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setActionLoading(true);
    try {
      await apiDeleteAll();
      setNotifications([]);
      setUnreadCount(0);
      setPage(1);
      setTotalPages(1);
      setOpenNotifOptions(false);
      setConfirmingDelete(false);
    } catch (err) {
      console.error("Erreur suppression notifications :", err);
    } finally {
      setActionLoading(false);
    }
  };

  // ---------------------------------------------------------------------
  // Ouverture du détail (marque immédiatement comme lue + déduit le compteur,
  // puis récupère le détail via l'API et resynchronise en arrière-plan)
  // ---------------------------------------------------------------------
  const handleOpenNotification = async (notification) => {
    setSelectedNotif(notification);
    setDetailLoading(true);

    const wasUnread = !notification.isRead;

    // Mise à jour optimiste immédiate : la notification passe à "lue" et le
    // badge de non-lus est déduit tout de suite, sans attendre la réponse réseau
    // (et même si l'API de détail ne marque pas la notification comme lue côté serveur).
    // Dans l'onglet "Non lu", une notification lue ne doit plus y figurer du tout —
    // elle reste seulement visible dans "Tout", avec l'état "lu".
    if (wasUnread) {
      setNotifications((prev) => {
        if (activeTab === "non-lu") {
          return prev.filter((n) => n.id !== notification.id);
        }
        return prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n));
      });
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      const fresh = await apiFetchNotificationById(notification.id);
      if (fresh) {
        setSelectedNotif({ ...fresh, isRead: true });
        setNotifications((prev) => {
          if (activeTab === "non-lu") {
            return prev.filter((n) => n.id !== fresh.id);
          }
          return prev.map((n) => (n.id === fresh.id ? { ...n, ...fresh, isRead: true } : n));
        });
      }
      // Resynchronise avec le serveur en arrière-plan (couvre le cas où la
      // notification a déjà été lue depuis un autre onglet/appareil).
      refreshUnreadCount();
    } catch (err) {
      console.error("Erreur récupération détail notification :", err);
      // L'état "lu" optimiste reste en place même si le détail échoue à charger.
    } finally {
      setDetailLoading(false);
    }
  };

  const visibleNotifications = notifications;

  return (
    // pl-16 (mobile/tablette) : laisse la place au bouton burger de la Sidebar
    // qui est en position fixed top-4 left-4. À partir de lg, la Sidebar est
    // toujours visible et le burger n'existe plus, donc on repasse à un
    // padding symétrique classique.
    <header className="h-16 flex-shrink-0 bg-white border border-gray-200 flex items-center pl-16 pr-3 sm:pl-16 sm:pr-4 lg:px-6 gap-3 sm:gap-4 lg:gap-6 sticky top-0 z-10">
      {/* --------------------------------------------------------------- */}
      {/* Badge type d'opérateur connecté — "COMPAGNIE", "AGENT",
          "DISTRIBUTEUR : ...", "COMMERÇANT : ..." */}
      {/* --------------------------------------------------------------- */}
      {operatorTypeLabel && (
        <span
          className="mr-auto flex items-center gap-2 text-sm sm:text-base font-semibold text-[#1EA4DC] bg-[#1EA4DC]/10 px-3 sm:px-4 py-1.5 sm:py-2 truncate max-w-[45vw] sm:max-w-xs"
          style={{ borderRadius: "10px" }}
        >
          <BadgeCheck size={18} className="flex-shrink-0" />
          <span className="truncate">{operatorTypeLabel}</span>
        </span>
      )}

      {/* --------------------------------------------------------------- */}
      {/* Notifications */}
      {/* --------------------------------------------------------------- */}
      <div className="relative" ref={notifRef}>
        <div
          onClick={() => {
            setOpenNotif((prev) => !prev);
            setOpenNotifOptions(false);
            setConfirmingDelete(false);
          }}
          className="relative cursor-pointer"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-semibold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>

        {openNotif && (
          <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-16 sm:top-auto sm:mt-3 w-auto sm:w-[26rem] sm:max-w-[90vw] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* En-tête */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-br from-[#1EA4DC]/5 to-[#0B2A6B]/5">
              <p className="font-semibold text-gray-900 text-sm sm:text-base">Notifications</p>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => loadNotifications(activeTab)}
                  disabled={loadingList}
                  title="Actualiser"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    size={15}
                    className={loadingList ? "animate-spin" : ""}
                  />
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenNotifOptions((prev) => !prev);
                      setConfirmingDelete(false);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <MoreVertical size={17} />
                  </button>

                  {openNotifOptions && (
                    <div className="absolute right-0 mt-2 w-60 sm:w-64 max-w-[85vw] bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        disabled={actionLoading}
                        className="flex items-center gap-2.5 w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        <CheckCheck size={16} className="text-gray-400" />
                        Marquer tout comme lu
                      </button>

                      {!confirmingDelete ? (
                        <button
                          type="button"
                          onClick={handleClearAll}
                          disabled={actionLoading}
                          className="flex items-center gap-2.5 w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                          Tout supprimer
                        </button>
                      ) : (
                        <div className="px-4 py-3 bg-red-50/60">
                          <p className="text-xs text-gray-600 mb-2">
                            Supprimer définitivement toutes les
                            notifications ?
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleClearAll}
                              disabled={actionLoading}
                              className="flex-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg py-1.5 transition-colors disabled:opacity-50"
                            >
                              {actionLoading ? "Suppression…" : "Confirmer"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingDelete(false)}
                              className="flex-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg py-1.5 transition-colors"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex px-4 sm:px-5 pt-3 gap-5 sm:gap-6 border-b border-gray-100">
              {[
                { key: "tout", label: "Tout" },
                { key: "non-lu", label: "Non lu" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative pb-3 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "text-[#1EA4DC]"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {tab.label}
                  {tab.key === "non-lu" && unreadCount > 0 && (
                    <span className="ml-1.5 text-[10px] font-semibold bg-[#1EA4DC]/10 text-[#1EA4DC] px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                  {activeTab === tab.key && (
                    <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#1EA4DC] rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Liste */}
            <div className="max-h-[60vh] sm:max-h-[26rem] overflow-y-auto px-2 sm:px-3 py-3 space-y-2">
              {loadingList && visibleNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <Loader2 size={22} className="animate-spin text-[#1EA4DC]" />
                  <p className="text-sm text-gray-400">Chargement…</p>
                </div>
              ) : listError ? (
                <div className="flex flex-col items-center justify-center py-14 text-center gap-2">
                  <AlertCircle size={22} className="text-red-400" />
                  <p className="text-sm text-gray-500">{listError}</p>
                  <button
                    type="button"
                    onClick={() => loadNotifications(activeTab)}
                    className="text-xs font-semibold text-[#1EA4DC] hover:underline mt-1"
                  >
                    Réessayer
                  </button>
                </div>
              ) : visibleNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-50 text-gray-300 mb-3">
                    <Bell size={20} />
                  </span>
                  <p className="text-sm text-gray-400">
                    Aucune notification pour le moment
                  </p>
                </div>
              ) : (
                <>
                  {visibleNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={handleOpenNotification}
                    />
                  ))}

                  {page < totalPages && (
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="w-full flex items-center justify-center gap-2 text-sm font-medium text-[#1EA4DC] hover:bg-[#1EA4DC]/5 rounded-xl py-3 transition-colors disabled:opacity-60"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          Chargement…
                        </>
                      ) : (
                        "Charger plus"
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Profil utilisateur */}
      {/* --------------------------------------------------------------- */}
      <div className="relative" ref={menuRef}>
        <div
          onClick={() => setOpenMenu((prev) => !prev)}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer"
        >
          <div className="w-9 h-9 bg-[#1EA4DC] rounded-full text-white flex items-center justify-center font-semibold flex-shrink-0">
            {getInitials()}
          </div>

          {/* Nom + email masqués sous sm pour laisser de la place au reste du header */}
          <div className="hidden sm:block text-sm leading-tight max-w-[9rem] md:max-w-[12rem]">
            <p className="font-semibold truncate">
              {[userInfo?.firstName, userInfo?.lastName]
                .filter(Boolean)
                .join(" ") || "Utilisateur"}
            </p>
            <p className="text-gray-500 text-xs truncate">{userInfo?.email || ""}</p>
          </div>

          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${
              openMenu ? "rotate-180" : ""
            }`}
          />
        </div>

        {openMenu && (
          <div className="absolute right-0 mt-3 w-72 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* En-tête utilisateur */}
            <div className="flex items-center gap-3 px-4 sm:px-5 py-4 bg-gradient-to-br from-[#1EA4DC]/5 to-[#0B2A6B]/5">
              <div className="w-11 h-11 bg-[#1EA4DC] rounded-full text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                {getInitials()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 truncate">
                  {[userInfo?.firstName, userInfo?.lastName]
                    .filter(Boolean)
                    .join(" ") || "Utilisateur"}
                </p>
                <p className="text-gray-500 text-xs truncate">
                  {userInfo?.email || ""}
                </p>
                {operatorTypeLabel && (
                  <p className="text-[11px] font-semibold text-[#1EA4DC] mt-0.5 truncate">
                    {operatorTypeLabel}
                  </p>
                )}
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium text-emerald-600 bg-emerald-50 flex-shrink-0">
                <BadgeCheck size={12} />
                Actif
              </span>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Liste d'actions */}
            <div className="py-2">
              <button
                type="button"
                onClick={handleGoToProfile}
                className="group flex items-center gap-3 w-full px-4 sm:px-5 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1EA4DC]/10 text-[#1EA4DC] flex-shrink-0">
                  <User size={17} />
                </span>
                <span className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    Mon Profil
                  </p>
                  <p className="text-xs text-gray-400">
                    Voir et modifier vos informations
                  </p>
                </span>
              </button>

              <button
                type="button"
                onClick={handleGoToCommissions}
                className="group flex items-center gap-3 w-full px-4 sm:px-5 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1EA4DC]/10 text-[#1EA4DC] flex-shrink-0">
                  <Wallet size={17} />
                </span>
                <span className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    Mes Commissions
                  </p>
                  <p className="text-xs text-gray-400">
                    {userInfo?.company
                      ? `Voir les commissions de ${userInfo.company}`
                      : "Consulter l'historique des commissions"}
                  </p>
                </span>
              </button>

              {isAgent && (
                <button
                  type="button"
                  onClick={handleGoToPermissions}
                  className="group flex items-center gap-3 w-full px-4 sm:px-5 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1EA4DC]/10 text-[#1EA4DC] flex-shrink-0">
                    <ShieldCheck size={17} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      Mes Permissions
                    </p>
                    <p className="text-xs text-gray-400">
                      Consulter vos droits d'accès
                    </p>
                  </span>
                </button>
              )}
            </div>

            <div className="h-px bg-gray-100" />

            {/* Déconnexion */}
            <div className="py-2">
              <button
                type="button"
                onClick={handleLogout}
                className="group flex items-center gap-3 w-full px-4 sm:px-5 py-3 text-left hover:bg-red-50 transition-colors"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-50 text-red-500 flex-shrink-0 group-hover:bg-red-100">
                  <LogOut size={17} />
                </span>
                <p className="text-sm font-semibold text-red-500">
                  Déconnexion
                </p>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Modale de détail d'une notification */}
      {/* --------------------------------------------------------------- */}
      <NotificationDetailModal
        notification={selectedNotif}
        loading={detailLoading}
        onClose={() => {
          setSelectedNotif(null);
          setDetailLoading(false);
        }}
      />
    </header>
  );
}