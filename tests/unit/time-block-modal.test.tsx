// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover">{children}</div>
  ),
}));

import { TimeBlockCreateModal } from "@/app/(dashboard)/dashboard/agenda/components/time-block-modal";

const BASE = {
  anchorX: 0,
  anchorY: 0,
  suggestedStartISO: "2026-06-19T17:00:00.000Z",
  suggestedEndISO: "2026-06-19T18:00:00.000Z",
  isPending: false,
  onClose: vi.fn(),
  onCreate: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TimeBlockCreateModal", () => {
  it("mostra erro e desabilita botão quando professionals=[] e sem initialProfId", () => {
    render(<TimeBlockCreateModal {...BASE} professionals={[]} />);

    expect(
      screen.getByText(/nenhum profissional disponível para bloqueio/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirmar bloqueio/i })
    ).toBeDisabled();
  });

  it("habilita botão quando initialProfId é passado mesmo com professionals=[]", () => {
    render(
      <TimeBlockCreateModal {...BASE} professionals={[]} professionalId="prof-abc" />
    );

    expect(
      screen.queryByText(/nenhum profissional disponível/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirmar bloqueio/i })
    ).not.toBeDisabled();
  });

  it("habilita botão quando professionals tem 1 entrada e nenhum initialProfId", () => {
    render(
      <TimeBlockCreateModal
        {...BASE}
        professionals={[{ id: "prof-1", name: "João" }]}
      />
    );

    expect(
      screen.queryByText(/nenhum profissional disponível/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirmar bloqueio/i })
    ).not.toBeDisabled();
  });

  it("não exibe <select> quando professionals tem apenas 1 entrada", () => {
    render(
      <TimeBlockCreateModal
        {...BASE}
        professionals={[{ id: "prof-1", name: "João" }]}
      />
    );

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("exibe <select> quando professionals tem mais de 1 entrada", () => {
    render(
      <TimeBlockCreateModal
        {...BASE}
        professionals={[
          { id: "prof-1", name: "João" },
          { id: "prof-2", name: "Maria" },
        ]}
      />
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("mantém botão desabilitado quando isPending=true mesmo com profId válido", () => {
    render(
      <TimeBlockCreateModal
        {...BASE}
        professionals={[{ id: "prof-1", name: "João" }]}
        isPending
      />
    );

    expect(
      screen.getByRole("button", { name: /confirmar bloqueio/i })
    ).toBeDisabled();
  });
});
