import { TriMappingPanel } from "@/components/TriMappingPanel";

export const metadata = {
    title: "Mapeador de TRI - Portal Admin",
    description: "Importação e mapeamento dinâmico de planilhas TRI",
};

export default function TriMappingPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Importação de Dados TRI</h2>
            </div>
            <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
                <TriMappingPanel />
            </div>
        </div>
    );
}
