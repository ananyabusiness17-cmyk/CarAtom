import { Modal, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export type CheckoutOrder = {
  payment_id: string;
  amount_minor?: number;
  amount?: { amount_minor: number; currency: string };
  currency?: string;
  razorpay_order_id?: string | null;
  razorpay_key_id?: string;
  key_id?: string;
  prefill?: { name?: string | null; contact?: string | null };
};

export function isStubCheckoutKey(key: string | undefined): boolean {
  return !key || key === 'rzp_test_dev';
}

export function checkoutKey(order: CheckoutOrder): string {
  return order.razorpay_key_id || order.key_id || 'rzp_test_dev';
}

function checkoutHtml(order: CheckoutOrder): string {
  const amount = order.amount_minor ?? order.amount?.amount_minor ?? 0;
  const rupees = Math.round(amount / 100);
  const key = checkoutKey(order);
  const orderId = order.razorpay_order_id ?? '';
  if (isStubCheckoutKey(key)) {
    return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="font-family:-apple-system,sans-serif;padding:24px;background:#F7FAFC;color:#142532">
  <p>Pay ₹${rupees}</p>
  <button style="min-height:44px;width:100%;background:#176B9E;color:#fff;border:0;border-radius:8px"
    onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:'success'}))">Pay now</button>
  <p style="text-align:center;margin-top:16px">
    <a href="#" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:'dismiss'}));return false">Cancel</a>
  </p>
</body></html>`;
  }
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1" />
<script src="https://checkout.razorpay.com/v1/checkout.js"></script></head>
<body>
<script>
  var options = {
    key: ${JSON.stringify(key)},
    amount: ${amount},
    currency: ${JSON.stringify(order.currency || order.amount?.currency || 'INR')},
    order_id: ${JSON.stringify(orderId)},
    prefill: {
      name: ${JSON.stringify(order.prefill?.name ?? '')},
      contact: ${JSON.stringify(order.prefill?.contact ?? '')}
    },
    handler: function () {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'success'}));
    },
    modal: {
      ondismiss: function () {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'dismiss'}));
      }
    }
  };
  new Razorpay(options).open();
</script>
</body></html>`;
}

export function RazorpayCheckout({
  order,
  onVerificationPending,
  onCheckoutDismissed,
}: {
  order: CheckoutOrder;
  onVerificationPending: (paymentId: string) => void;
  onCheckoutDismissed: () => void;
}) {
  return (
    <Modal visible animationType="slide" onRequestClose={onCheckoutDismissed}>
      <View style={styles.fill}>
        <WebView
          originWhitelist={[
            'about:blank',
            'about:srcdoc',
            'https://checkout.razorpay.com',
            'https://*.razorpay.com',
            'https://api.razorpay.com',
          ]}
          source={{ html: checkoutHtml(order) }}
          onMessage={(event) => {
            try {
              const payload = JSON.parse(event.nativeEvent.data) as { type?: string };
              if (payload.type === 'success') {
                onVerificationPending(order.payment_id);
              } else {
                onCheckoutDismissed();
              }
            } catch {
              onCheckoutDismissed();
            }
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#F7FAFC' },
});
