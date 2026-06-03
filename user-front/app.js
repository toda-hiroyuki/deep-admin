const plans = {
  private: {
    code: "G-KYO-003-1-PR",
    name: "貸切3時間プラン",
    price: 18000,
    tags: ["貸切", "夜", "人気"],
    tagClasses: ["teal", "teal", "coral"],
    description: "祇園周辺をガイドと歩く、少人数向けの夜ツアー。グループだけで楽しめる貸切プランです。",
    minGuests: 1,
    maxGuests: 8,
    sellable: true,
  },
  group: {
    code: "G-KYO-003-1-GR",
    name: "グループ3時間プラン",
    price: 12000,
    tags: ["グループ", "夜", "定番"],
    tagClasses: ["teal", "teal", ""],
    description: "他のゲストと一緒に参加する、グループ向けの夜ツアー。新しい出会いも旅の醍醐味です。",
    minGuests: 1,
    maxGuests: 8,
    sellable: true,
  },
};

const state = {
  plan: "private",
  guestCount: 2,
};

function formatPrice(yen) {
  return "¥" + yen.toLocaleString("ja-JP");
}

function updatePlanUI() {
  const plan = plans[state.plan];

  if (!plan.sellable) {
    document.getElementById("planDetail").classList.add("hidden");
    document.getElementById("planUnavailable").classList.remove("hidden");
    return;
  }

  document.getElementById("planDetail").classList.remove("hidden");
  document.getElementById("planUnavailable").classList.add("hidden");

  // 価格
  document.getElementById("priceMain").textContent = formatPrice(plan.price);
  document.getElementById("mobilePriceFrom").textContent = plan.price.toLocaleString("ja-JP");

  // バッジ
  document.getElementById("planBadges").innerHTML = plan.tags
    .map((tag, i) => `<span class="badge ${plan.tagClasses[i]}">${tag}</span>`)
    .join("");

  // 説明
  document.getElementById("planDescription").textContent = plan.description;

  // 人数ヒント
  document.getElementById("countHint").textContent =
    `${plan.minGuests}〜${plan.maxGuests}名まで`;

  // 人数を範囲内にクランプ
  state.guestCount = Math.max(
    plan.minGuests,
    Math.min(state.guestCount, plan.maxGuests),
  );

  updateGuestCountUI();
}

function updateGuestCountUI() {
  const plan = plans[state.plan];
  const count = state.guestCount;

  document.getElementById("guestCountDisplay").textContent = count;

  document.getElementById("countDown").disabled = count <= plan.minGuests;
  document.getElementById("countUp").disabled = count >= plan.maxGuests;

  const total = plan.price * count;
  document.getElementById("priceBreakdown").textContent =
    `${formatPrice(plan.price)} × ${count}名`;
  document.getElementById("priceTotal").textContent = formatPrice(total);
}

// プランタブ切り替え
document.querySelectorAll(".plan-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".plan-tab").forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    state.plan = btn.dataset.plan;
    updatePlanUI();
  });
});

// 人数操作
document.getElementById("countDown").addEventListener("click", () => {
  const min = plans[state.plan].minGuests;
  if (state.guestCount > min) {
    state.guestCount--;
    updateGuestCountUI();
  }
});

document.getElementById("countUp").addEventListener("click", () => {
  const max = plans[state.plan].maxGuests;
  if (state.guestCount < max) {
    state.guestCount++;
    updateGuestCountUI();
  }
});

// 予約ボタン（デスクトップ）
document.getElementById("bookBtn").addEventListener("click", () => {
  const dateEl = document.getElementById("tourDate");
  if (!dateEl.value) {
    dateEl.focus();
    dateEl.style.borderColor = "var(--coral)";
    dateEl.addEventListener("change", () => {
      dateEl.style.borderColor = "";
    }, { once: true });
    return;
  }
  const plan = plans[state.plan];
  const date = new Date(dateEl.value).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  alert(`予約確認\n\nプラン: ${plan.name}\n参加日: ${date}\n人数: ${state.guestCount}名\n合計: ${formatPrice(plan.price * state.guestCount)}\n\n※ これはプロトタイプです。実際の予約処理は行われません。`);
});

// モバイル: 予約バーのボタンでモーダルを開く
const modalBackdrop = document.getElementById("modalBackdrop");
const modalInner = document.getElementById("modalInner");

function renderModal() {
  const plan = plans[state.plan];
  modalInner.innerHTML = `
    <h2 style="font-size:18px;font-weight:800;margin:0 0 16px;">プランを選ぶ</h2>
    <div class="plan-selector" style="border:1px solid var(--line);border-radius:10px;overflow:hidden;">
      ${Object.entries(plans).map(([key, p]) => `
        <button class="plan-tab ${state.plan === key ? "active" : ""}" type="button" data-modal-plan="${key}" style="border-radius:0;">
          <span class="plan-tab-name">${p.name}</span>
          <span class="plan-tab-price">${formatPrice(p.price)}〜</span>
        </button>
      `).join("")}
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;padding:16px;background:var(--surface);border:1px solid var(--line);border-radius:10px;">
      <div style="display:flex;align-items:baseline;gap:6px;">
        <span style="font-size:12px;color:var(--muted);">お一人様</span>
        <span style="font-size:28px;font-weight:900;color:var(--coral);">${formatPrice(plan.price)}</span>
        <span style="font-size:12px;color:var(--muted);">（税込）</span>
      </div>
      <div class="form-field">
        <label for="modalDate">参加日</label>
        <input type="date" id="modalDate" value="${document.getElementById("tourDate").value}" />
      </div>
      <div class="form-field">
        <label>参加人数</label>
        <div class="count-input">
          <button class="count-btn" type="button" id="modalCountDown">−</button>
          <span class="count-value" id="modalCountDisplay">${state.guestCount}</span>
          <span class="count-unit">名</span>
          <button class="count-btn" type="button" id="modalCountUp">＋</button>
        </div>
      </div>
      <div class="price-summary">
        <div class="price-row">
          <span id="modalPriceBreakdown">${formatPrice(plan.price)} × ${state.guestCount}名</span>
          <span id="modalPriceTotal">${formatPrice(plan.price * state.guestCount)}</span>
        </div>
      </div>
      <button class="btn-book" type="button" id="modalBookBtn">この日程で予約する</button>
      <p class="book-note">24時間前まで無料でキャンセル可能</p>
    </div>
  `;

  // モーダル内のプランタブ
  modalInner.querySelectorAll("[data-modal-plan]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.plan = btn.dataset.modalPlan;
      // デスクトップタブも同期
      document.querySelectorAll(".plan-tab:not([data-modal-plan])").forEach((b) => {
        b.classList.toggle("active", b.dataset.plan === state.plan);
        b.setAttribute("aria-selected", b.dataset.plan === state.plan ? "true" : "false");
      });
      updatePlanUI();
      renderModal();
    });
  });

  // モーダル内の人数操作
  const modalDown = document.getElementById("modalCountDown");
  const modalUp = document.getElementById("modalCountUp");
  const modalCountDisplay = document.getElementById("modalCountDisplay");
  const modalPriceBreakdown = document.getElementById("modalPriceBreakdown");
  const modalPriceTotal = document.getElementById("modalPriceTotal");

  function updateModalCount() {
    const p = plans[state.plan];
    modalCountDisplay.textContent = state.guestCount;
    modalDown.disabled = state.guestCount <= p.minGuests;
    modalUp.disabled = state.guestCount >= p.maxGuests;
    modalPriceBreakdown.textContent = `${formatPrice(p.price)} × ${state.guestCount}名`;
    modalPriceTotal.textContent = formatPrice(p.price * state.guestCount);
  }

  modalDown.addEventListener("click", () => {
    const min = plans[state.plan].minGuests;
    if (state.guestCount > min) {
      state.guestCount--;
      updateModalCount();
      updateGuestCountUI();
    }
  });

  modalUp.addEventListener("click", () => {
    const max = plans[state.plan].maxGuests;
    if (state.guestCount < max) {
      state.guestCount++;
      updateModalCount();
      updateGuestCountUI();
    }
  });

  // モーダル内の日付を本体と同期
  document.getElementById("modalDate").addEventListener("change", (e) => {
    document.getElementById("tourDate").value = e.target.value;
  });

  document.getElementById("modalBookBtn").addEventListener("click", () => {
    const dateEl = document.getElementById("modalDate");
    if (!dateEl.value) {
      dateEl.focus();
      return;
    }
    const p = plans[state.plan];
    const date = new Date(dateEl.value).toLocaleDateString("ja-JP", {
      year: "numeric", month: "long", day: "numeric",
    });
    closeModal();
    setTimeout(() => {
      alert(`予約確認\n\nプラン: ${p.name}\n参加日: ${date}\n人数: ${state.guestCount}名\n合計: ${formatPrice(p.price * state.guestCount)}\n\n※ これはプロトタイプです。`);
    }, 200);
  });
}

function openModal() {
  renderModal();
  modalBackdrop.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  document.body.style.overflow = "";
}

document.getElementById("mobileBookBtn").addEventListener("click", openModal);
document.getElementById("modalClose").addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

// 初期描画
updatePlanUI();
