import { PageContainer, PageHeader } from "@/components/layout";
import { TriMappingPanel } from "@/components/TriMappingPanel";

export const metadata = {
    title: "Mapeador de TRI - Portal Admin",
    description: "Importação e mapeamento dinâmico de planilhas TRI",
};

export default function TriMappingPage() {
    return (
        <PageContainer>
            <PageHeader
                title="Importação de Dados TRI"
                description="Importe planilhas de conversão de acertos em notas TRI por ano e área do conhecimento."
            />
            <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
                <TriMappingPanel />
            </div>
        </PageContainer>
    );
}
