# HUD

`src/hud`의 Vue 3 화면이다. 코어 상태를 표시하고, 월드가 넘겨준 대상에 대해 코어 함수를 호출한다. 키 입력과 맵 판정은 하지 않는다.

```text
src/hud/
  Hotbar.vue
  InventoryPanel.vue
  BuildMenu.vue
  StoragePanel.vue
  CampfirePanel.vue
  OvenPanel.vue
  TradePanel.vue
  SkillPanel.vue
  Clock.vue
  Vitals.vue
  SleepConfirm.vue
```

## 패널

- `Hotbar`: 핸드 1–9와 현재 핸드를 보여 준다. 그 뒤의 소지 칸은 그리지 않는다. 선택은 월드가 호출한 `selectSlot` 결과를 반영한다
- `InventoryPanel`: 소지 칸에 있는 아이템과 현재 총중량, 소지 한도, `silver`를 보여 준다. 핸드 밖의 칸에 있는 아이템도 포함한다. 칸마다 핸드 1–9를 지정할 수 있고, 그 조작은 `assignHand`를 호출한다
- `BuildMenu`: 월드가 망치를 든 채 바라본 빈 타일 좌표를 알리면 연다. `warehouse`, `campfire`, `house`, `oven`을 고르면 그 좌표로 `place`를 호출하고 닫는다
- `StoragePanel`: 월드가 창고 id를 알리면 연다. 캐릭터와 창고에 있는 아이템을 모두 보여 준다. 옮기는 조작은 `transfer`를 호출한다. 창고 한도는 그 건물 정의의 값을 표시한다. 칸 수는 세지 않는다
- `CampfirePanel`: 월드가 모닥불 id를 알리면 연다. 고기 굽기와 귀리죽은 `cook`을 호출한다. 재료가 없으면 그 조작을 두지 않는다
- `OvenPanel`: 월드가 화덕 id를 알리면 연다. 밀은 `bread`, 호밀은 `rye-bread`로 `cook`을 호출한다. 아마와 양배추는 조리하지 않는다. 재료가 없으면 그 조작을 두지 않는다
- `TradePanel`: 월드가 상인 id를 알리면 연다. 구매가 표의 아이템마다 구매는 `buy`, 판매는 `sell`을 호출한다. `silver`와 구매가, 그 절반인 판매가를 보여 준다
- `SkillPanel`: 채집, 농사, 사냥, 제조의 레벨, 경험치, 해금된 테크를 보여 준다
- `Clock`: 현재 시각을 화면 중앙 상단에 오전·오후와 시·분으로 보여 준다. 시각 옆에 현재 계절 아이콘을 둔다
- `Vitals`: 허기, 갈증, 체력, 스테미나를 보여 준다. 달리기가 켜져 있으면 `달리기`, 꺼져 있으면 `걷기`로 보여 준다. 체력이 0이면 게임 오버를 보여 준다
- `SleepConfirm`: 월드가 집에서의 취침을 알리면 `취침하시겠습니까?`를 연다. 취침을 고르면 `sleep`을 호출하고, 고르지 않으면 상태를 바꾸지 않는다. 액션이 반복되면 같은 확인이 다시 열린다

패널은 코어가 돌려준 다음 상태를 그대로 표시한다. 무게 합, 감속, 제작 가능 여부를 화면에서 다시 계산하지 않는다.
