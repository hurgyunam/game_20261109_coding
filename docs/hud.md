# HUD

`src/hud`의 Vue 3 화면이다. 코어 상태를 표시하고, 월드가 넘겨준 대상에 대해 코어 함수를 호출한다. 키 입력과 맵 판정은 하지 않는다.

```text
src/hud/
  Hotbar.vue
  InventoryPanel.vue
  BuildMenu.vue
  StoragePanel.vue
  CampfirePanel.vue
  SkillPanel.vue
  Clock.vue
```

## 패널

- `Hotbar`: 슬롯 1–9와 현재 핸드를 보여 준다. 선택은 월드가 호출한 `selectSlot` 결과를 반영한다
- `InventoryPanel`: 아이템과 현재 총중량, 소지 한도를 보여 준다
- `BuildMenu`: 월드가 망치를 든 채 바라본 빈 타일 좌표를 알리면 연다. `warehouse` 또는 `campfire`를 고르면 그 좌표로 `place`를 호출하고 닫는다
- `StoragePanel`: 월드가 창고 id를 알리면 연다. 옮기는 조작은 `transfer`를 호출한다. 창고 한도는 그 건물 정의의 값을 표시한다
- `CampfirePanel`: 월드가 모닥불 id를 알리면 연다. 고기 굽기는 `cook`을 호출한다
- `SkillPanel`: 채집, 농사, 사냥, 제조의 레벨, 경험치, 해금된 테크를 보여 준다
- `Clock`: 현재 시각을 화면 중앙 상단에 오전·오후와 시·분으로 보여 준다. 시각 옆에 현재 계절 아이콘을 둔다

패널은 코어가 돌려준 다음 상태를 그대로 표시한다. 무게 합, 감속, 제작 가능 여부를 화면에서 다시 계산하지 않는다.
