import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { InspectionItem } from '@thanamol/shared'

const INSPECTION_CHECKLIST = [
  {
    category_number: '1',
    category_name: 'โครงสร้างอาคาร',
    items: [
      { number: '1.1', name: 'ภายนอกอาคาร' },
      { number: '1.2', name: 'พื้น' },
      { number: '1.3', name: 'ผนัง' },
      { number: '1.4', name: 'เพดาน / หลังคา' },
      { number: '1.5', name: 'เสา' },
      { number: '1.6', name: 'อื่น ๆ' },
    ],
  },
  {
    category_number: '2',
    category_name: 'ภายในอาคาร',
    items: [
      { number: '2.1', name: 'พื้น' },
      { number: '2.2', name: 'ผนัง' },
      { number: '2.3', name: 'เพดาน / หลังคา' },
      { number: '2.4', name: 'เสา' },
      { number: '2.5', name: 'ประตู' },
      { number: '2.6', name: 'หน้าต่าง' },
      { number: '2.7', name: 'อื่น ๆ' },
    ],
  },
  {
    category_number: '3',
    category_name: 'ระบบไฟฟ้า',
    items: [
      { number: '3.1', name: 'สายไฟ / ปลั๊กไฟ' },
      { number: '3.2', name: 'โคมไฟ' },
      { number: '3.3', name: 'หม้อแปลง' },
      { number: '3.4', name: 'มิเตอร์ไฟ' },
      { number: '3.5', name: 'ไฟฉุกเฉิน' },
      { number: '3.6', name: 'อื่น ๆ' },
    ],
  },
  {
    category_number: '4',
    category_name: 'ระบบประปา',
    items: [
      { number: '4.1', name: 'มิเตอร์น้ำ' },
      { number: '4.2', name: 'ท่อน้ำ' },
      { number: '4.3', name: 'อื่น ๆ' },
    ],
  },
  {
    category_number: '5',
    category_name: 'ระบบสื่อสาร',
    items: [
      { number: '5.1', name: 'สัญญาณโทรศัพท์' },
      { number: '5.2', name: 'โทรศัพท์' },
      { number: '5.3', name: 'อื่น ๆ' },
    ],
  },
  {
    category_number: '6',
    category_name: 'ระบบสุขาภิบาล',
    items: [
      { number: '6.1', name: 'โถส้วม' },
      { number: '6.2', name: 'อ่างล้างมือ' },
      { number: '6.3', name: 'ก๊อกน้ำ' },
      { number: '6.4', name: 'สายยาง' },
      { number: '6.5', name: 'อื่น ๆ' },
    ],
  },
  {
    category_number: '7',
    category_name: 'สำนักงาน / Office',
    items: [
      { number: '7.1', name: 'แอร์' },
      { number: '7.2', name: 'ฝ้า / หลังคา' },
      { number: '7.3', name: 'ฝาผนัง / พื้น' },
      { number: '7.4', name: 'หน้าต่าง' },
      { number: '7.5', name: 'อื่น ๆ (ไฟแสงสว่าง)' },
    ],
  },
  {
    category_number: '8',
    category_name: 'อื่น / Other',
    items: [
      { number: '8.1', name: 'Ramp support' },
      { number: '8.2', name: 'Dock levelers / สะพานปรับระดับ' },
      { number: '8.3', name: 'Fire Pump / ปั๊มน้ำดับเพลิง' },
      { number: '8.4', name: 'Sprinkler / ระบบหัวกระจายน้ำดับเพลิง' },
      { number: '8.5', name: 'Fire hose reel / ระบบสายฉีดน้ำดับเพลิง' },
      { number: '8.6', name: 'Fire alarm control panel / สัญญาณเตือนไฟไหม้' },
      { number: '8.7', name: 'Smoke detector / อุปกรณ์ตรวจจับควัน' },
      { number: '8.8', name: 'Lightning Conductor / สายล่อฟ้า' },
      { number: '8.9', name: 'Fire extinguishers / ถังดับเพลิง' },
      { number: '8.10', name: 'CCTV / กล้องวงจรปิด' },
      { number: '8.11', name: 'Overhead Crane' },
      { number: '8.12', name: 'ที่ชาร์ตแบตเตอรี่รถยก' },
    ],
  },
]

type Props = {
  items: InspectionItem[]
  onChange: (items: InspectionItem[]) => void
  readOnly?: boolean
}

export function InspectionChecklist({ items, onChange, readOnly = false }: Props) {
  function findItem(number: string): InspectionItem | undefined {
    return items.find((i) => i.number === number)
  }

  function upsertItem(
    number: string,
    categoryNumber: string,
    categoryName: string,
    field: keyof InspectionItem,
    value: string,
  ) {
    const existing = items.findIndex((i) => i.number === number)
    const base: InspectionItem =
      existing >= 0
        ? { ...items[existing] }
        : {
            number,
            name: '',
            category_number: categoryNumber,
            category_name: categoryName,
            status: 'normal',
          }
    const updated = { ...base, [field]: value }
    if (existing >= 0) {
      const next = [...items]
      next[existing] = updated
      onChange(next)
    } else {
      onChange([...items, updated])
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-light tracking-wider text-slate-700">
          SECTION 3: รายการตรวจสอบ
        </CardTitle>
        <p className="text-xs text-slate-400 bg-indigo-50 p-2 rounded mt-1">
          วัตถุประสงค์: เพื่อตรวจสอบความเสียหายของอาคารคลังสินค้าและทรัพย์สินก่อนส่งมอบอาคารคลังสินค้าให้แก่ผู้เช่า
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {INSPECTION_CHECKLIST.map((category) => (
          <div key={category.category_number} className="border-l-4 border-indigo-400 pl-4">
            <h3 className="font-light text-slate-800 text-sm mb-3 tracking-wide">
              {category.category_number} {category.category_name}
            </h3>
            <div className="space-y-2">
              {category.items.map((item) => {
                const data = findItem(item.number)
                const statusValue = data?.status ?? 'normal'
                const responsible = data?.responsible_person ?? ''
                const abnormal = data?.abnormal_condition ?? ''

                return (
                  <div
                    key={item.number}
                    className="bg-slate-50 p-3 rounded border border-slate-100"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[10px] text-slate-500 tracking-wider uppercase">
                          {item.number} {item.name}
                        </Label>
                        {readOnly ? (
                          <p className="text-xs font-light text-slate-700 mt-1">
                            {statusValue === 'normal' ? 'ปกติ' : 'ไม่ปกติ'}
                          </p>
                        ) : (
                          <Select
                            value={statusValue}
                            onValueChange={(v) =>
                              upsertItem(
                                item.number,
                                category.category_number,
                                category.category_name,
                                'status',
                                v,
                              )
                            }
                          >
                            <SelectTrigger className="mt-1 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">ปกติ</SelectItem>
                              <SelectItem value="abnormal">ไม่ปกติ</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500 tracking-wider uppercase">
                          ผู้รับผิดชอบ
                        </Label>
                        {readOnly ? (
                          <p className="text-xs font-light text-slate-700 mt-1">
                            {responsible || '-'}
                          </p>
                        ) : (
                          <Input
                            className="mt-1 h-8 text-xs"
                            value={responsible}
                            onChange={(e) =>
                              upsertItem(
                                item.number,
                                category.category_number,
                                category.category_name,
                                'responsible_person',
                                e.target.value,
                              )
                            }
                          />
                        )}
                      </div>
                      <div>
                        <Label className="text-[10px] text-slate-500 tracking-wider uppercase">
                          สภาพไม่ปกติ
                        </Label>
                        {readOnly ? (
                          <p className="text-xs font-light text-slate-700 mt-1">
                            {abnormal || '-'}
                          </p>
                        ) : (
                          <Input
                            className="mt-1 h-8 text-xs"
                            value={abnormal}
                            onChange={(e) =>
                              upsertItem(
                                item.number,
                                category.category_number,
                                category.category_name,
                                'abnormal_condition',
                                e.target.value,
                              )
                            }
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
