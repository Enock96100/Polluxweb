import {
  ArrowLeft,
  Download,
  User,
  ShieldCheck,
  Package,
  Tv,
  ListOrdered,
  FileText
} from "lucide-react"

import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import axios from "axios"

/* ===================== MAIN COMPONENT ===================== */

export default function DetailAbonnementCanalPlus() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const token = localStorage.getItem("token")
        const response = await axios.get(
          `https://youapi.youneed.app/pollux/prod/api/canal-subscriptions/${id}`,
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        )

        // Gestion automatique si l'API renvoie un tableau ou un objet direct
        const resData = response.data?.data;
        if (Array.isArray(resData)) {
          setSubscription(resData[0])
        } else {
          setSubscription(resData)
        }
      } catch (error) {
        console.error("ERREUR DETAIL ABONNEMENT :", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSubscription()
  }, [id])

  if (loading) {
    return (
      <div className="p-4 sm:p-8 text-gray-500 font-medium">
        Chargement...
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="p-4 sm:p-8 text-gray-500 font-medium">
        Aucune donnée trouvée
      </div>
    )
  }

  // Sécurisation de l'accès aux opérations (changement de formule ou opération initiale)
  const mainOperation = subscription.formulaChanges?.[0]?.operation || subscription.operation

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 bg-[#F5F7FA] min-h-screen">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-black text-sm sm:text-base"
      >
        <ArrowLeft className="w-5 h-5" /> Retour
      </button>

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">
            Détail Abonnement Canal plus
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm">
            Information sur l'opération
          </p>
        </div>
      </div>

      {/* BLOCS DE GRILLES D'INFORMATIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

        {/* BLOC 1 : INFORMATION SUR L'ABONNEMENT */}
        <InfoCard title="Information sur de l'abonnement" icon={<Tv size={18} />}>
          <InfoRow label="N° Abonnement" value={subscription.subscriptionNumber || "—"} />
          <InfoRow label="N° Décodeur" value={subscription.decoderNumber || "—"} />
          <InfoRow label="Statut" value={subscription.status || "—"} />
          <InfoRow
            label="Date d'activation"
            value={subscription.activatedAt ? new Date(subscription.activatedAt).toLocaleString("fr-FR") : "—"}
          />
          <InfoRow
            label="Date de création"
            value={subscription.createdAt ? new Date(subscription.createdAt).toLocaleString("fr-FR") : "—"}
          />
          <InfoRow
            label="Dernière mise à jour"
            value={subscription.updatedAt ? new Date(subscription.updatedAt).toLocaleString("fr-FR") : "—"}
          />
          <InfoRow label="Appliqué physiquement" value={subscription.physicallyApplied ? "oui" : "non"} />
          <InfoRow
            label="Date"
            value={subscription.appliedAt ? new Date(subscription.appliedAt).toLocaleString("fr-FR") : "—"}
          />
        </InfoCard>

        {/* BLOC 2 : FORMULE CANAL + */}
        <InfoCard title="Formule Canal +" icon={<Package size={18} />}>
          <InfoRow label="Nom formule" value={subscription.currentFormula?.name || "—"} />
          <InfoRow label="Code" value={subscription.currentFormula?.code || "—"} />
          <InfoRow
            label="Prix"
            value={subscription.currentFormula?.price ? `${Number(subscription.currentFormula.price).toLocaleString("fr-FR")} F` : "—"}
          />
          <InfoRow label="Durée" value={subscription.currentFormula?.durationInDays ? `${subscription.currentFormula.durationInDays} jours` : "—"} />
          <InfoRow label="Statut" value={subscription.currentFormula?.isActive ? "Active" : "Inactive"} />
        </InfoCard>

        {/* BLOC 3 : CLIENT */}
        <InfoCard title="Client" icon={<User size={18} />}>
          <InfoRow label="Nom" value={`${subscription.client?.firstName || ""} ${subscription.client?.lastName || ""}`} />
          <InfoRow label="Téléphone" value={subscription.client?.phone || "—"} />
          <InfoRow label="Email" value={subscription.client?.email || "—"} />
          <InfoRow label="Ville" value={subscription.client?.city || "—"} />
          <InfoRow label="Type de Pièce" value={subscription.client?.attachementName || "—"} />
          <InfoRow label="N° Pièce" value={subscription.client?.idNumber || "—"} />
          <InfoRow
            label="Client depuis"
            value={subscription.client?.createdAt ? new Date(subscription.client.createdAt).toLocaleString("fr-FR") : "—"}
          />
        </InfoCard>

        {/* BLOC 4 : DISTRIBUTEUR */}
        <InfoCard title="Distributeur" icon={<ShieldCheck size={18} />}>
          <InfoRow label="Nom commercial" value={subscription.distributor?.businessName || "—"} />
          <InfoRow label="Téléphone" value={subscription.distributor?.user?.phone || "—"} />
          <InfoRow label="Email" value={subscription.distributor?.user?.email || "—"} />
          <InfoRow label="N° Enregistrement" value={subscription.distributor?.registrationNumber || "—"} />
          <InfoRow label="Adresse" value={subscription.distributor?.address || "—"} />
          <InfoRow label="Ville" value={subscription.distributor?.city || "—"} />
          <InfoRow label="Statut" value={subscription.distributor?.isActive ? "Actif" : "Inactif"} />
          <InfoRow
            label="Membre depuis"
            value={subscription.distributor?.createdAt ? new Date(subscription.distributor.createdAt).toLocaleString("fr-FR") : "—"}
          />
        </InfoCard>

        {/* BLOC 5 : PARABOLE */}
        <InfoCard title="Parabole" icon={<Tv size={18} />}>
          <InfoRow label="Nom" value={subscription.parabola?.name || "—"} />
          <InfoRow label="Code" value={subscription.parabola?.code || "—"} />
          <InfoRow label="Prix" value={subscription.parabola?.price ? `${Number(subscription.parabola.price).toLocaleString("fr-FR")} F` : "—"} />
          <InfoRow label="Statut" value={subscription.parabola?.status || "—"} />
          <InfoRow label="Etat" value={subscription.parabola?.isActive || "—"} />
        </InfoCard>

        {/* BLOC 6 : PRODUIT */}
        <InfoCard title="Produit" icon={<Package size={18} />}>
          <InfoRow label="Nom" value={subscription.subProduct?.name || "—"} />
          <InfoRow label="code" value={subscription.subProduct?.code || "—"} />
          <InfoRow
            label="Prix"
            value={subscription.subProduct?.price ? `${Number(subscription.subProduct.price).toLocaleString("fr-FR")} F` : "—"}
          />
          <InfoRow label="Renouvelable" value={subscription.subProduct?.renewable ? "Oui" : "Non"} />
          <InfoRow label="Statut" value={subscription.subProduct?.status || "null"} />
        </InfoCard>

      </div>

      {/* BLOC 7 : OPÉRATION (LARGEUR COMPLÈTE EN BAS) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="bg-[#1EA4DC] text-white px-4 sm:px-6 py-3 sm:py-3.5 flex items-center gap-2 font-medium text-sm sm:text-base">
          <ListOrdered size={18} />
          <h2>Opération</h2>
        </div>

        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 bg-white">
          <InfoRow label="Type" value={subscription.operation?.operationType || "—"} />
          <InfoRow
            label="Montant"
            value={subscription.operation?.amount ? `${Number(subscription.operation.amount).toLocaleString("fr-FR")} F` : "—"}
          />
          <InfoRow label="Statut" value={subscription.operation?.status || "—"} />
          <InfoRow label="Opérateur" value={subscription.operation?.operatorType || "—"} />
          <InfoRow label="Description" value={subscription.operation?.description || "—"} />
          <InfoRow
            label="Date de demande"
            value={subscription.operation?.requestedAt ? new Date(subscription.operation.requestedAt).toLocaleString("fr-FR") : "—"}
          />
          <InfoRow
            label="Date de création"
            value={subscription.operation?.createdAt ? new Date(subscription.operation.createdAt).toLocaleString("fr-FR") : "—"}
          />
          <InfoRow label="Commission reçu" value={subscription.operation?.commissionEarned ? "oui" : "non"} />
          <InfoRow
            label="Date de validation"
            value={subscription.operation?.validatedAt ? new Date(subscription.operation.validatedAt).toLocaleString("fr-FR") : "—"}
          />
        </div>
      </div>

      {/* BLOC 8 : DOCUMENTS JOINTS SI DISPONIBLES */}
      {(subscription.distributor?.rccm || subscription.distributor?.ifu) && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-[#1EA4DC] text-white px-4 sm:px-6 py-3 sm:py-3.5 flex items-center gap-2 font-medium text-sm sm:text-base">
            <FileText size={18} />
            <h2>Documents joints</h2>
          </div>

          <div className="p-4 sm:p-6 divide-y divide-gray-100">
            {subscription.distributor?.rccm && (
              <DocumentRow
                label="RCCM"
                filename="Télécharger RCCM"
                url={subscription.distributor.rccm}
              />
            )}
            {subscription.distributor?.ifu && (
              <DocumentRow
                label="IFU"
                filename="Télécharger IFU"
                url={subscription.distributor.ifu}
              />
            )}
          </div>
        </div>
      )}

    </div>
  )
}

/* ===================== SUB-COMPONENTS ===================== */

function InfoCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      <div className="bg-[#1EA4DC] text-white px-4 sm:px-6 py-3 sm:py-3.5 flex items-center gap-2 font-medium text-sm sm:text-base">
        {icon}
        <h2>{title}</h2>
      </div>

      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 flex-1 bg-white">
        {children}
      </div>
    </div>
  )
}

function InfoRow({ label, value, isStatus = false }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 sm:gap-2 py-1.5 border-b border-gray-50 last:border-b-0 text-xs sm:text-sm">
      <span className="text-gray-400 font-medium">
        {label}
      </span>

      {isStatus ? (
        <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto">
          {value}
        </span>
      ) : (
        <span
          className={`font-semibold break-words text-left sm:text-right ${
            value === "null" || value === "—" ? "text-gray-300 italic" : "text-gray-800"
          }`}
        >
          {value}
        </span>
      )}
    </div>
  )
}

function DocumentRow({ label, filename, url }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 py-3 first:pt-0 last:pb-0 text-xs sm:text-sm">
      <span className="text-gray-400 font-medium">
        {label}
      </span>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-[#1EA4DC] hover:underline font-medium"
      >
        <Download size={14} />
        {filename}
      </a>
    </div>
  )
}