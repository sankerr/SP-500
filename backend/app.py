from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import numpy as np
import datetime
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.layers import Dense, LSTM, Input, Dropout
from tensorflow.keras.models import Model, Sequential

app = Flask('__sp500__')
CORS(app)

table = pd.read_html('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies')
df_stocks = table[0]
df_stocks = df_stocks[['Symbol', 'Security', 'GICS Sector', 'GICS Sub Industry']]

end1 = datetime.datetime.now()  # current date and time
start1 = end1 - datetime.timedelta(days=60)
sectors = ['XLY', 'XLP', 'XLE', 'XLF', 'XLV', 'XLI', 'XLB', 'XLK', 'XTL', 'XLU', 'IEI', 'LQD', 'SPHY', 'SPY']

data_sectors = {}
for sec in sectors:
    data = yf.download(sec, start=start1, end=end1)['Adj Close']
    d = data.resample('D').ffill().pct_change().dropna()
    m = data.resample('M').ffill().pct_change().dropna()
    data_sectors[sec] = d.index[-1].strftime("%d-%b-%Y") + ';' + str(round(d[-1], 5)) + '#$#' + m.index[-1].strftime("%b") + ';' + str(round(m[-1], 5))

scaler = MinMaxScaler(feature_range=(0, 1))
look_back = 60
pred_steps = 5
predsForStock = None
inp = Input(shape=(look_back, 1))
x = LSTM(50, return_sequences=True)(inp)
x = Dropout(0.2)(x)
x = LSTM(50)(x)
x = Dropout(0.2)(x)
x = Dense(5)(x)
x = Dense(pred_steps)(x)
model = Model(inp, x)


def create_data(data, look_back, pred_steps):
    # Split the data into x_train and y_train data sets
    x = []
    y = []

    for i in range(look_back, len(data) - 1 - pred_steps):
        x.append(data[i - look_back:i, 0])
        y.append(data[i:i + pred_steps, 0])

    x, y = np.array(x), np.array(y)
    x = np.reshape(x, (x.shape[0], x.shape[1], 1))
    return x, y


@app.route('/getAllStocksData', methods=['POST'])
def getAllStocksData():
    df = df_stocks[['Symbol', 'Security']]
    res = {}
    for index, row in df.iterrows():
        res[row['Symbol']] = row['Security']
    return res


@app.route('/getAllSectorsData', methods=['POST'])
def getAllSectorsData():
    return data_sectors


@app.route('/train', methods=['POST'])
def train():
    end = datetime.datetime.now()  # current date and time
    start = end - datetime.timedelta(days=20 * 365) # 20 years
    symbol = str(request.json['symbol'])
    data = yf.download(symbol, start=start, end=end)
    data = data[['Adj Close']]
    # Scale the data
    scaled_data = scaler.fit_transform(data)
    features, targets = create_data(scaled_data, look_back, pred_steps)

    train_size = int(0.8 * len(features))
    model.compile(loss='mean_squared_error', optimizer='adam')
    model.fit(features[:train_size], targets[:train_size], validation_data=[features[train_size:], targets[train_size:]], epochs=2)

    preds = model.predict(features[train_size:])
    preds = scaler.inverse_transform(preds)
    train = data[:train_size + look_back + pred_steps + 1]
    valid = data[train_size + look_back + pred_steps + 1:]

    t = ';'.join(str(x) for x in list(train['Adj Close']))
    v = ';'.join(str(x) for x in list(valid['Adj Close']))
    p = ';'.join(str(x) for x in preds[:,0])

    idx = ';'.join(str(x).split(' ')[0] for x in list(data.index))
    t_idx = ';'.join(str(x).split(' ')[0] for x in list(train.index))
    v_idx = ';'.join(str(x).split(' ')[0] for x in list(valid.index))

    newPreds = model.predict(features[-1:])
    newPreds = scaler.inverse_transform(newPreds)
    p_new = ';'.join(str(x) for x in newPreds[0])

    predsForStock = {'train': t, 'val': v, 'pred': p, 'newPred': p_new, 'idx': idx, 'trainIdx': t_idx, 'validIdx': v_idx}

    return predsForStock

if __name__ == '__main__':
    app.run(debug=True)
