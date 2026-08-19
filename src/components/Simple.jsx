import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  FileText,
  User,
  ShieldCheck,
  CreditCard,
  Info,
  Paperclip,
  Percent,
} from "lucide-react"

import { useEffect, useState } from "react"
import { useNavigate, useLocation, useParams } from "react-router-dom"
import axios from "axios"

/* ===================== HELPERS ===================== */

function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("access_token") ||
    ""
  )
}

/* ===================== MAIN COMPONENT ===================== */

export default function DetailOperation({ operationId: directId }) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()

  const resolvedId =
    directId ||
    params?.id ||
    location.state?.operationId ||
    localStorage.getItem("lastOperationId")

  const [operation, setOperation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    if (resolvedId) {
      fetchOperation()
    } else {
      setLoading(false)
    }
  }, [resolvedId])

  /* ================= FETCH ================= */

  const fetchOperation = async () => {
    try {
      setLoading(true)
      const response = await axios.get(
        `https://youapi.youneed.app/pollux/dev/api/operations/${resolvedId}`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
        }
      )
      setOperation(response.data?.data)
    } catch (error) {
      console.error("Erreur detail operation :", error)
    } finally {
      setLoading(false)
    }
  }

  /* ================= ACTIONS ================= */

  const callAction = async (endpoint, errorMsg) => {
    try {
      setActionLoading(true)
      setActionError(null)
      await axios.post(
        `https://youapi.youneed.app/pollux/dev/api/operations/${resolvedId}/${endpoint}`,
        "",
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
        }
      )
      await fetchOperation()
    } catch (error) {
      console.error(`Erreur ${endpoint} :`, error)
      setActionError(errorMsg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleValidate = () => callAction("validate", "Erreur lors de la validation de l'opération.")
  const handleReject   = () => callAction("reject",   "Erreur lors du rejet de l'opération.")
  const handleCancel   = () => callAction("cancel",   "Erreur lors de l'annulation de l'opération.")

  /* ================= LOADING / GUARD ================= */

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen bg-[#F5F7FA]">
        <div className="flex items-center gap-2 text-gray-400">
          <svg className="animate-spin w-5 h-5 text-[#1EA4DC]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm">Chargement de l'opération…</span>
        </div>
      </div>
    )
  }

  if (!resolvedId || !operation) {
    return (
      <div className="p-8 bg-[#F5F7FA] min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          Aucune donnée ou identifiant d'opération trouvé.
        </div>
      </div>
    )
  }

  /* ================= STATUS ================= */

  const isPending   = operation.status === "PENDING"
  const isValidated = operation.status === "COMPLETED" || operation.status === "VALIDATED"
  const isRejected  = operation.status === "REJECTED"
  const isCancelled = operation.status === "CANCELLED"

  const statusLabel = isPending
    ? "En attente"
    : isValidated
    ? "Validée"
    : isRejected
    ? "Rejetée"
    : isCancelled
    ? "Annulée"
    : operation.status

  const statusColor = isPending
    ? "bg-orange-100 text-orange-600"
    : isValidated
    ? "bg-green-100 text-green-600"
    : "bg-red-100 text-red-600"

  /* ================= VARIABLES INFORMATIONS DÉTAILLÉES ================= */

  // Banque : depuis metadata.bank ou subProduct.bank
  const bank = operation.metadata?.bank || operation.subProduct?.bank || null

  // Formule
  const formulaName = operation.metadata?.prepaidCardFormulaName
    || operation.subProduct?.prepaidCardFormulaId
    || "—"

  // Formule Plafond
  const formulaMaxBalance = operation.metadata?.prepaidCardFormulaMaxBalance
    ?? null

  // Catégorie
  const category = operation.subProduct?.service?.category
    ? operation.subProduct.service.category === "PREPAID_CARD"
      ? "Carte Prépayée"
      : operation.subProduct.service.category
    : operation.operationType === "PREPAID_CARD_RECHARGE"
    ? "Carte Prépayée"
    : "—"

  // Quantité demandée (pour recharge = 1 carte)
  const quantiteDemandee = operation.operationType === "PREPAID_CARD_RECHARGE"
    ? "1 Carte Prépayée(s)"
    : operation.metadata?.quantity
    ? `${operation.metadata.quantity} unité(s)`
    : "—"

  // Total estimé = montant
  const totalEstime = operation.amount
    ? `${Number(operation.amount).toLocaleString("fr-FR")} FCFA`
    : "—"

  // Stock disponible : depuis metadata si présent
  const stockDisponible = operation.metadata?.stockAvailable != null
    ? `${operation.metadata.stockAvailable} unité(s)`
    : operation.subProduct?.stock != null
    ? `${operation.subProduct.stock} unité(s)`
    : "—"

  // Total décodeur (ou total final effectif)
  const totalDecodeur = operation.effectiveAmount
    ? `${Number(operation.effectiveAmount).toLocaleString("fr-FR")} FCFA`
    : "—"

  // Fonction pour formater la date de naissance
  const formatBirthDate = (dateString) => {
    if (!dateString) return "—"
    const date = new Date(dateString)
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  /* ================= VARIABLES COMMISSIONS ================= */

  const appliedCommissionType = operation.appliedCommissionType

  const commissionTypeLabel = appliedCommissionType === "FIXED"
    ? "Montant fixe"
    : appliedCommissionType === "PERCENTAGE"
    ? "Montant en pourcentage"
    : appliedCommissionType

  // "Vous" = le commerçant, cette page étant dédiée au détail d'opération commerçant
  // ⚠️ À CONFIRMER : le champ merchantCommissionAmount est-il toujours présent quel que soit operatorType ?
  const merchantCommission = Number(operation.merchantCommissionAmount) || 0

  const companyCommission = Number(operation.companyCommissionAmount) || 0
  const totalCommission = merchantCommission + companyCommission

  const merchantCommissionFormatted = merchantCommission > 0
    ? `${merchantCommission.toLocaleString("fr-FR")} FCFA`
    : "—"

  const merchantCommissionFormattedLarge = merchantCommission > 0
    ? `${Number(merchantCommission).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA`
    : "—"

  const totalCommissionFormatted = totalCommission > 0
    ? `${Number(totalCommission).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA`
    : "—"

  /* ================= RENDER ================= */

  return (
    <div className="p-8 space-y-6 bg-[#F5F7FA] min-h-screen">

      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-gray-800">Détail sur l'opération</h1>
          <p className="text-gray-500 text-sm">Information sur l'opération</p>
        </div>

        <div className="flex items-center gap-4">

          {/* PENDING → Valider + Rejeter */}
          {isPending && (
            <>
              <button
                onClick={handleValidate}
                disabled={actionLoading}
                className="bg-[#1EA4DC] text-white px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle size={18} />
                {actionLoading ? "En cours…" : "Valider l'Opération"}
              </button>

              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="bg-red-600 text-white px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50"
              >
                <XCircle size={18} />
                {actionLoading ? "En cours…" : "Rejeter l'Opération"}
              </button>
            </>
          )}

          {/* VALIDATED → Annuler */}
          {isValidated && (
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="bg-orange-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50"
            >
              <XCircle size={18} />
              {actionLoading ? "En cours…" : "Annuler l'Opération"}
            </button>
          )}

          <button
            onClick={() => navigate(-1)}
            className="border bg-white px-4 py-3 rounded-xl"
          >
            <ArrowLeft size={18} />
          </button>

        </div>
      </div>

      {/* MESSAGE ERREUR ACTION */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          {actionError}
        </div>
      )}

      {/* CONTAINER */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6">
        <div className="space-y-8">

          {/* LIGNE 1 : Opération + Client + Pièces jointes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* OPÉRATION + COMMISSIONS (dans le même cadre) */}
            <InfoCard title="Détail sur l'opération" icon={<CreditCard size={18} />}>
              <InfoRow label="Type opération" value={operation.operationType} />
              <InfoRow label="Montant" value={`${Number(operation.amount).toLocaleString("fr-FR")} FCFA`} />
              <InfoRow label="Montant effectif" value={`${Number(operation.effectiveAmount).toLocaleString("fr-FR")} FCFA`} />
              <InfoRow label="Description" value={operation.description} />
              <InfoRow label="Date demande" value={new Date(operation.createdAt).toLocaleString("fr-FR")} />
              <InfoRow label="Statut" value={statusLabel} statusColor={statusColor} isStatus />

              {/* DÉTAILS DES COMMISSIONS (si elles existent) */}
              {appliedCommissionType && (
                <>
                  <div className="my-6 border-t pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <Percent size={16} className="text-[#1EA4DC]" />
                        <h3 className="text-gray-800 font-semibold">Détails des commissions</h3>
                      </div>
                      <span className="bg-[#1EA4DC]/10 text-[#1EA4DC] px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                        {commissionTypeLabel}
                      </span>
                    </div>

                    {/* Tableau des commissions */}
                    <div className="mt-4">
                      {/* En-têtes */}
                      <div className="grid grid-cols-3 gap-4 mb-4 text-gray-400 text-xs font-semibold pb-3 border-b border-gray-100">
                        <div></div>
                        <div className="text-center">Montant</div>
                        <div className="text-right">Montant</div>
                      </div>

                      {/* Rows */}
                      <div className="space-y-0">
                        {/* Vous (Commerçant) */}
                        <div className="grid grid-cols-3 gap-4 items-center py-3 border-b border-gray-50">
                          <div className="text-gray-800 font-medium">Vous</div>
                          <div className="text-center text-gray-800">{merchantCommissionFormatted}</div>
                          <div className="text-right text-gray-800 font-semibold">{merchantCommissionFormattedLarge}</div>
                        </div>

                        {/* Pollux */}
                        <div className="grid grid-cols-3 gap-4 items-center py-3 border-b border-gray-50">
                          <div className="text-gray-800 font-medium">Pollux</div>
                          <div className="text-center text-gray-400">—</div>
                          <div className="text-right text-gray-400">—</div>
                        </div>

                        {/* Total */}
                        <div className="grid grid-cols-3 gap-4 items-center py-3">
                          <div className="text-[#1EA4DC] font-bold">Total</div>
                          <div className="text-center text-gray-400">—</div>
                          <div className="text-right text-[#1EA4DC] font-bold">{totalCommissionFormatted}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </InfoCard>

            {/* CLIENT + PIÈCES JOINTES */}
            <div className="space-y-8">
              {/* CLIENT */}
              <InfoCard title="Client" icon={<User size={18} />}>
                <InfoRow
                  label="Nom"
                  value={
                    operation.client
                      ? `${operation.client.firstName || ""} ${operation.client.lastName || ""}`.trim() || "—"
                      : "—"
                  }
                />
                <InfoRow label="Email" value={operation.client?.email || "—"} />
                <InfoRow label="Téléphone" value={operation.client?.phone || "—"} />
                <InfoRow label="Date de naissance" value={formatBirthDate(operation.client?.birthDate)} />
                <InfoRow label="Pays" value={operation.client?.country || "—"} />
                <InfoRow label="Ville" value={operation.client?.city || "—"} />
                <InfoRow label="Adresse" value={operation.client?.address || "—"} />
                <InfoRow label="Nom du fichier" value={operation.client?.attachementName || "—"} />
              </InfoCard>

              {/* PIÈCES JOINTES */}
              {operation.client?.idAttachment && (
                <InfoCard title="Pièces jointes" icon={<Paperclip size={18} />}>
                  <div className="space-y-3">
                    <InfoRow label="ID" value={operation.client?.idNumber || "—"} />
                    <div className="pb-3 border-b border-gray-50">
                      <p className="text-gray-500 text-sm mb-2">Document</p>
                      <img
                        src={operation.client.idAttachment}
                        alt={operation.client?.attachementName || "Pièce jointe"}
                        className="w-full max-w-xs rounded-lg border border-gray-200 shadow-sm object-cover"
                      />
                    </div>
                  </div>
                </InfoCard>
              )}
            </div>

          </div>

          {/* LIGNE 2 : Commerçant + Informations détaillées */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* COMMERÇANT */}
            <InfoCard title="Commerçant" icon={<ShieldCheck size={18} />}>
              {/* ⚠️ À CONFIRMER : le chemin exact du prénom/nom du commerçant (operation.merchant?.user?.firstName / lastName) */}
              <InfoRow
                label="Nom"
                value={
                  `${operation.merchant?.user?.firstName || ""} ${operation.merchant?.user?.lastName || ""}`.trim() || "—"
                }
              />
              <InfoRow label="Email" value={operation.merchant?.user?.email || "—"} />
              <InfoRow label="Téléphone" value={operation.merchant?.user?.phone || "—"} />
              <InfoRow label="Ville" value={operation.merchant?.city || "—"} />
              <InfoRow
                label="Statut"
                value={operation.merchant?.isActive ? "Actif" : "Inactif"}
                isStatus
                statusColor={operation.merchant?.isActive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}
              />
            </InfoCard>

            {/* INFORMATIONS DÉTAILLÉES */}
            <InfoCard title="Informations détaillées" icon={<Info size={18} />}>
              {/* Banque avec logo */}
              {bank && (
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  {bank.logo && (
                    <img
                      src={bank.logo}
                      alt={bank.name}
                      className="w-12 h-12 object-contain rounded-lg border border-gray-200 p-1"
                    />
                  )}
                  <div>
                    <p className="text-gray-800 font-semibold text-sm">{bank.name || "—"}</p>
                    <p className="text-gray-400 text-xs">Code: {bank.code || "—"}</p>
                  </div>
                </div>
              )}
              <InfoRow label="Formule" value={formulaName} />
              <InfoRow
                label="Formule Plafond"
                value={formulaMaxBalance != null ? Number(formulaMaxBalance).toLocaleString("fr-FR") : "—"}
              />
              <InfoRow label="Catégorie" value={category} />
              <InfoRow label="Quantité demandée" value={quantiteDemandee} />
              <InfoRow label="Total estimé" value={totalEstime} />
              <InfoRow label="Stock disponible" value={stockDisponible} />
              <InfoRow label="Total décodeur" value={totalDecodeur} />
            </InfoCard>

          </div>

          {/* LIGNE 3 : Preuve de paiement (pleine largeur) */}
          <div className="grid grid-cols-1 gap-8">
            <InfoCard title="Preuve de paiement" icon={<FileText size={18} />}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <InfoRow label="Méthode" value={operation.metadata?.paymentProof?.paymentMethod || "—"} />
                <InfoRow label="Référence" value={operation.metadata?.paymentProof?.receiptNumber || "—"} />
                <InfoRow label="Notes" value={operation.metadata?.paymentProof?.notes || "—"} />
              </div>
              {operation.metadata?.paymentProof?.proofUrl && (
                <div className="mt-2">
                  <a
                    href={operation.metadata.paymentProof.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#1EA4DC] font-medium"
                  >
                    Voir la preuve
                  </a>
                </div>
              )}
            </InfoCard>
          </div>

        </div>
      </div>
    </div>
  )
}

/* ================= COMPOSANTS ================= */

function InfoCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-[#1EA4DC] text-white px-6 py-3.5 flex items-center gap-2">
        {icon}
        <h2>{title}</h2>
      </div>
      <div className="p-6 space-y-4">
        {children}
      </div>
    </div>
  )
}

function InfoRow({ label, value, isStatus, statusColor }) {
  return (
    <div className="flex justify-between text-sm border-b border-gray-50 py-2">
      <span className="text-gray-500">{label}</span>
      {isStatus ? (
        <span className={`${statusColor} px-3 py-1 rounded-full text-xs font-semibold`}>
          {value}
        </span>
      ) : (
        <span className="text-gray-800 font-semibold text-right">
          {value || "—"}
        </span>
      )}
    </div>
  )
}