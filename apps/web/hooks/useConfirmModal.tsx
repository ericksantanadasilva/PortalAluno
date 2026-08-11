"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Info, XCircle, Loader2 } from "lucide-react";

export type ModalType = "info" | "success" | "warning" | "danger";

export interface ConfirmModalOptions {
  title: string;
  description: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Hook reutilizável para substituir alert() e confirm() nativos por modais modernos e acessíveis.
 *
 * @example
 * const { showAlert, showConfirm, ConfirmModal } = useConfirmModal();
 *
 * // Alerta simples
 * showAlert("Atenção", "O nome da disciplina é obrigatório.", "warning");
 *
 * // Confirmação de exclusão
 * showConfirm(
 *   "Excluir Disciplina",
 *   "Deseja realmente excluir esta disciplina e seus temas?",
 *   () => handleDelete(id),
 *   "danger"
 * );
 *
 * // No JSX:
 * return (
 *   <>
 *     ...conteúdo...
 *     <ConfirmModal />
 *   </>
 * );
 */
export function useConfirmModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ConfirmModalOptions>({
    title: "",
    description: "",
    type: "info",
  });

  const showModal = useCallback((opts: ConfirmModalOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const showAlert = useCallback(
    (title: string, description: string, type: ModalType = "info") => {
      showModal({ title, description, type });
    },
    [showModal]
  );

  const showConfirm = useCallback(
    (
      title: string,
      description: string,
      onConfirm: () => void | Promise<void>,
      type: ModalType = "warning"
    ) => {
      showModal({
        title,
        description,
        type,
        confirmText: "Confirmar",
        cancelText: "Cancelar",
        onConfirm,
      });
    },
    [showModal]
  );

  const closeModal = useCallback(() => {
    if (loading) return;
    setIsOpen(false);
    options.onCancel?.();
  }, [loading, options]);

  const handleConfirm = async () => {
    if (options.onConfirm) {
      try {
        setLoading(true);
        await options.onConfirm();
      } catch (err) {
        console.error("Erro ao executar ação no modal:", err);
      } finally {
        setLoading(false);
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  const ModalComponent = () => (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) closeModal();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {options.type === "danger" && (
              <XCircle className="w-5 h-5 text-destructive shrink-0" />
            )}
            {options.type === "warning" && (
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            )}
            {options.type === "success" && (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            )}
            {options.type === "info" && (
              <Info className="w-5 h-5 text-primary shrink-0" />
            )}
            {options.title}
          </DialogTitle>
          <DialogDescription className="pt-2 text-sm text-muted-foreground whitespace-pre-line">
            {options.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          {options.onConfirm ? (
            <>
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={loading}
              >
                {options.cancelText || "Cancelar"}
              </Button>
              <Button
                variant={options.type === "danger" ? "destructive" : "default"}
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {options.confirmText || "Confirmar"}
              </Button>
            </>
          ) : (
            <Button onClick={closeModal}>OK</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return {
    showModal,
    showAlert,
    showConfirm,
    closeModal,
    ConfirmModal: ModalComponent,
  };
}
