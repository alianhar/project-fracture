import { TrashSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { clearHistory } from '@/hooks/use-local-history';

export function ClearHistoryButton({ disabled }: { disabled?: boolean }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled}>
          <TrashSimple size={14} />
          Hapus riwayat
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus seluruh riwayat?</DialogTitle>
          <DialogDescription>
            Tindakan ini tidak bisa dibatalkan. Riwayat hanya tersimpan di browser ini (localStorage).
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 p-4">
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              Batal
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="solid" size="sm" onClick={clearHistory}>
              Hapus
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
