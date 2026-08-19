import {
  ArrowLeft,
  Download,
  CreditCard,
  User,
  ShieldCheck,
  Package,
  FileText
} from "lucide-react"

import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import axios from "axios"

/* ===================== MAIN COMPONENT ===================== */

export default function DetailCartePrepayee() {

  const { id } = useParams()
  const navigate = useNavigate()

  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    const fetchCard = async () => {

      try {

        const token = localStorage.getItem("token")

        const response = await axios.get(
          `https://youapi.youneed.app/pollux/dev/api/prepaid-cards/${id}`,
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        )

        setCard(response.data?.data)

      } catch (error) {
        console.error("ERREUR DETAIL CARTE :", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCard()

  }, [id])

  if (loading) {
    return (
      <div className="p-4 sm:p-8 text-gray-500 font-medium">
        Chargement...
      </div>
    )
  }

  if (!card) {
    return (
      <div className="p-4 sm:p-8 text-gray-500 font-medium">
        Aucune donnée trouvée
      </div>
    )
  }

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
            Détail sur la Carte prépayé
          </h1>

          <p className="text-gray-500 text-xs sm:text-sm">
            Information sur l'opération
          </p>
        </div>
      </div>

      {/* BLOCS DE GRILLES D'INFORMATIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">

        {/* BLOC 1 : INFORMATION SUR LA CARTE */}
        <InfoCard
          title="Information sur la carte"
          icon={<CreditCard size={18} />}
        >

          <InfoRow
            label="ID de la carte"
            value={card.cardId || "—"}
          />

          <InfoRow
            label="Numéro de la carte"
            value={card.cardNumber ? `*************${card.cardNumber}` : "—"}
            />
             <InfoRow
            label="Titulaire"
            value={card.cardHolderName || "—"}
          />

          <InfoRow
            label="Solde"
            value={`${Number(card.balance || 0).toLocaleString("fr-FR")} FCFA`}
          />

          <InfoRow
            label="Date d'activation"
            value={
              card.activatedAt
                ? new Date(card.activatedAt).toLocaleString("fr-FR")
                : "—"
            }
          />

          <InfoRow
            label="Date de création"
            value={
              card.createdAt
                ? new Date(card.createdAt).toLocaleString("fr-FR")
                : "—"
            }
          />

          <InfoRow
            label="Dernière mise à jour"
            value={
              card.updatedAt
                ? new Date(card.updatedAt).toLocaleString("fr-FR")
                : "—"
            }
          />

        </InfoCard>

        {/* BLOC 2 : CLIENT */}
        <InfoCard
          title="Client"
          icon={<User size={18} />}
        >

          <InfoRow
            label="Nom complet"
            value={`${card.client?.firstName || ""} ${card.client?.lastName || ""}`}
          />

          <InfoRow
            label="Téléphone"
            value={card.client?.phone || "—"}
          />

          <InfoRow
            label="Email"
            value={card.client?.email || "—"}
          />

          <InfoRow
            label="Type de pièce"
            value={card.client?.attachementName || "—"}
          />

          <InfoRow
            label="N° Pièce"
            value={card.client?.idNumber || "—"}
          />

          <InfoRow
            label="Adresse résidentiel"
            value={card.client?.address || "—"}
          />

        </InfoCard>

        {/* BLOC 3 : DISTRIBUTEUR */}
        <InfoCard
          title="Distributeur"
          icon={<ShieldCheck size={18} />}
        >

          <InfoRow
            label="Nom commercial"
            value={card.distributor?.businessName || "—"}
          />

          <InfoRow
            label="Email"
            value={card.distributor?.user?.email || "—"}
          />

          <InfoRow
            label="Téléphone"
            value={card.distributor?.user?.phone || "—"}
          />

          <InfoRow
            label="N° d'enregistrement"
            value={card.distributor?.registrationNumber || "—"}
          />

          <InfoRow
            label="Adresse"
            value={card.distributor?.address || "—"}
          />

          <InfoRow
            label="Ville"
            value={card.distributor?.city || "—"}
          />

          <InfoRow
            label="Statut"
            value={card.distributor?.isActive ? "Actif" : "Inactif"}
            isStatus
          />

        </InfoCard>

        {/* BLOC 4 : PRODUIT */}
        <InfoCard
          title="Produit"
          icon={<Package size={18} />}
        >

          <InfoRow
            label="Nom"
            value={card.bank?.name || "—"}
          />

          <InfoRow
            label="Code"
            value={card.cardId || "—"}
          />

          <InfoRow
            label="Prix"
            value={`${Number(card.balance || 0).toLocaleString("fr-FR")} FCFA`}
          />

          <InfoRow
            label="Formule"
            value={card.status || "—"}
          />

          <InfoRow
            label="Banque"
            value={card.bank?.name || "—"}
          />

          <InfoRow
            label="Statut"
            value={card.status || "—"}
          />

        </InfoCard>

      </div>

      {/* BLOC 5 : DOCUMENTS JOINTS */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

        <div className="bg-[#1EA4DC] text-white px-4 sm:px-6 py-3 sm:py-3.5 flex items-center gap-2 font-medium text-sm sm:text-base">
          <FileText size={18} />
          <h2>Documents joints</h2>
        </div>

        <div className="p-4 sm:p-6 divide-y divide-gray-100">

          {card.subscriptionAttachment && (
            <DocumentRow
              label="Document de souscription"
              filename="Télécharger le document"
              url={card.subscriptionAttachment}
            />
          )}

          {card.client?.idAttachment && (
            <DocumentRow
              label="Pièce d'identité"
              filename="Télécharger la pièce"
              url={card.client.idAttachment}
            />
          )}

          {card.distributor?.rccm && (
            <DocumentRow
              label="RCCM"
              filename="Télécharger RCCM"
              url={card.distributor.rccm}
            />
          )}

          {card.distributor?.ifu && (
            <DocumentRow
              label="IFU"
              filename="Télécharger IFU"
              url={card.distributor.ifu}
            />
          )}

        </div>

      </div>

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
            value === "null" ? "text-gray-300 italic" : "text-gray-800"
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