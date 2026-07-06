import { useState } from "react";
import { toast } from "sonner";

import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import Modal from "@/components/ui/Modal";
import Pagination from "@/components/ui/Pagination";
import Skeleton from "@/components/ui/Skeleton";
import Tabs from "@/components/ui/Tabs";
import Textarea from "@/components/ui/Textarea";

type TabValue = "info" | "settings" | "history";

export default function HomePage() {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<TabValue>("info");

  const handleLoading = () => {
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      toast.success("완료되었습니다.");
    }, 2000);
  };

  const handleConfirm = () => {
    toast.success("확인되었습니다.");
    setConfirmOpen(false);
  };

  return (
    <>
      <LoadingOverlay open={loading} />

      <section className="flex w-full max-w-4xl flex-col gap-10 px-6 py-10">
        <div>
          <h1 className="text-4xl font-bold">Frontend Template 🚀</h1>

          <p className="mt-2 text-slate-500">공통 UI 컴포넌트 테스트 페이지</p>
        </div>

        {/* Button */}
        <Card>
          <h2 className="mb-5 text-xl font-semibold">Button</h2>

          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>

            <Button variant="outline">Outline</Button>

            <Button variant="secondary">Secondary</Button>

            <Button onClick={() => toast.success("Toast 테스트 성공!")}>Toast</Button>

            <Button onClick={handleLoading}>Loading</Button>

            <Button onClick={() => setOpen(true)}>Modal</Button>

            <Button variant="outline" onClick={() => setConfirmOpen(true)}>
              Confirm
            </Button>
          </div>
        </Card>

        {/* Input */}
        <Card>
          <h2 className="mb-5 text-xl font-semibold">Input</h2>

          <Input label="이름" placeholder="이름을 입력하세요." />
        </Card>

        {/* Textarea */}
        <Card>
          <h2 className="mb-5 text-xl font-semibold">Textarea</h2>

          <Textarea label="내용" placeholder="내용을 입력하세요." />
        </Card>

        {/* Badge */}
        <Card>
          <h2 className="mb-5 text-xl font-semibold">Badge</h2>

          <div className="flex flex-wrap gap-2">
            <Badge>기본</Badge>
            <Badge variant="success">완료</Badge>
            <Badge variant="warning">대기</Badge>
            <Badge variant="danger">실패</Badge>
          </div>
        </Card>

        {/* Avatar */}
        <Card>
          <h2 className="mb-5 text-xl font-semibold">Avatar</h2>

          <div className="flex items-center gap-4">
            <Avatar name="비타" size="sm" />
            <Avatar name="비타" />
            <Avatar name="비타" size="lg" />
          </div>
        </Card>

        {/* Tabs */}
        <Card>
          <h2 className="mb-5 text-xl font-semibold">Tabs</h2>

          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              {
                label: "정보",
                value: "info",
                content: <p className="text-sm text-slate-600">정보 내용입니다.</p>,
              },
              {
                label: "설정",
                value: "settings",
                content: <p className="text-sm text-slate-600">설정 내용입니다.</p>,
              },
              {
                label: "이력",
                value: "history",
                content: <p className="text-sm text-slate-600">이력 내용입니다.</p>,
              },
            ]}
          />
        </Card>

        {/* Skeleton */}
        <Card>
          <h2 className="mb-5 text-xl font-semibold">Skeleton</h2>

          <div className="space-y-3">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </Card>

        {/* Empty */}
        <Card>
          <h2 className="mb-5 text-xl font-semibold">EmptyState</h2>

          <EmptyState
            title="데이터가 없습니다."
            description="새로운 데이터를 추가해보세요."
            actionLabel="추가하기"
            onAction={() => toast.info("버튼 클릭")}
          />
        </Card>

        {/* Pagination */}
        <Card>
          <h2 className="mb-5 text-xl font-semibold">Pagination</h2>

          <Pagination page={page} totalPages={10} onChange={setPage} />
        </Card>

        <Modal open={open} title="테스트 모달" onClose={() => setOpen(false)}>
          <p>Modal Component</p>
        </Modal>

        <ConfirmDialog
          open={confirmOpen}
          title="확인 모달"
          description="정말 진행하시겠습니까?"
          confirmText="진행"
          cancelText="취소"
          onConfirm={handleConfirm}
          onCancel={() => setConfirmOpen(false)}
        />
      </section>
    </>
  );
}
