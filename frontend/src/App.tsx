import React, { Component } from 'react';
// @ts-ignore
import Select from 'react-select';
import { observer } from 'mobx-react';
import { observable, runInAction, computed } from 'mobx';
import * as FontAwesome from 'react-icons/fa';
import logo from './logo1.jpg';
import './App.css';
import Card from './card'
import { Line } from 'react-chartjs-2';
import Carousel from 'react-bootstrap/Carousel'


enum httpMethod {
    'GET',
    'POST',
    'PUT',
    'DELETE'
}

let sectors_name: Record<string, string> = {
    'XLY': 'Consumer Discretionary',
    'XLP': 'Consumer Staples',
    'XLE': 'Energy',
    'XLF': 'Financials',
    'XLV': 'Health Care',
    'XLI': 'Industrials',
    'XLB': 'Materials',
    'XLK': 'Technology',
    'XTL': 'Telecom',
    'XLU': 'Utilities',
    'IEI': 'Treasury Bond',
    'LQD': 'Investment Grade Corporate Bond',
    'SPHY': 'Portfolio High Yield Bond',
    'SPY': 'S&P 500'}

interface IState {
    selectedStock: string
    selectedStockKey: string
    stockOptions: {}
    sectors: ISector[]
    isLoading: boolean
    endTrain: boolean
    train: string[]
    val: string[]
    pred: string[]
    newPred: string[]
    idx: string[]
    trainIdx: string[]
    validIdx: string[]
}

interface ISector {
    name: string
    key: string
    d_index: string
    d_val: number
    m_index: string
    m_val: number
}

@observer
class App extends Component {

    @observable private localState: IState = {
        selectedStock: '',
        selectedStockKey: '',
        stockOptions: [],
        sectors: [],
        isLoading: false,
        endTrain: false,
        train: [],
        val: [],
        pred: [],
        newPred: [],
        idx: [],
        trainIdx: [],
        validIdx: []
    }

    public componentDidMount() {
        this.fetchStocks();
    }

    private makeGetRequest(url: string, httpRequestType: httpMethod, body: object) {
        let fetchPromise = fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=utf-8;',
            },
            body: JSON.stringify(body)
        }). then(response => response.json());

        return fetchPromise;
    }

    private fetchStocks = async () => {
        let res = await this.makeGetRequest('http://127.0.0.1:5000/getAllStocksData', httpMethod.POST, {});
        let opt = [];
        for (let key in res) {
            let value = res[key];
            opt.push({value: key, label: value})
        }
        let sectors = await this.makeGetRequest('http://127.0.0.1:5000/getAllSectorsData', httpMethod.POST, {});
        let sectors_data: ISector[] = [];
        for (let key in sectors) {
            let value: string = sectors[key].split('#$#')
            let d_value = value[0].split(';')
            let m_value = value[1].split(';')
            sectors_data.push({name: sectors_name[key], key: key, d_index: d_value[0], d_val: +d_value[1], m_index: m_value[0], m_val: +m_value[1]})
        }

        this.localState.stockOptions = opt;
        this.localState.sectors = sectors_data;

        this.localState.isLoading = false;
    }

    private handleChange = (event: any) => {
        runInAction(() => {
            this.localState.selectedStock = event;
            this.localState.selectedStockKey = event.value;
            this.localState.endTrain = false;
        });
    };

    @computed private get isStockDataValid() {
        return this.localState.selectedStock !== "";
    }

    private train = async () => {
        const {selectedStockKey} = this.localState
        this.localState.isLoading = true;
        let trainAns = await this.makeGetRequest('http://127.0.0.1:5000/train', httpMethod.POST, {'symbol': selectedStockKey});
        this.localState.train = trainAns['train'].split(';')
        this.localState.val = trainAns['val'].split(';')
        this.localState.pred = trainAns['pred'].split(';')
        this.localState.newPred = trainAns['newPred'].split(';')
        this.localState.idx = trainAns['idx'].split(';')
        this.localState.trainIdx = trainAns['trainIdx'].split(';')
        this.localState.validIdx = trainAns['validIdx'].split(';')
        this.localState.isLoading = false;
        this.localState.endTrain = true;
    }

    public renderPrediction = () => {
        const { newPred } = this.localState
        let dates: string[] = [];
        let i;
        let d = new Date();
        for (i = 0; i < 5; i++) {
            d.setDate(d.getDate() + 1)
            if (d.getDay() === 6)
                d.setDate(d.getDate() + 2)
            else if (d.getDay() === 0)
                d.setDate(d.getDate() + 1)
            dates.push(d.toDateString());
        }


        return (
            <Card>
                <table className="table table-sm">
                    <thead className="thead-light">
                    <tr>
                        <th />
                        <th scope="col">Date</th>
                        <th scope="col">Close price</th>
                    </tr>
                    </thead>
                    <tbody>
                    {
                        newPred.map((p, index) =>
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <th>{dates[index]}</th>
                                <td>{p}</td>
                            </tr>)
                    }
                    </tbody>
                </table>
            </Card>
        )
    }

    public renderChart = () => {
        let i;
        const { idx, trainIdx, validIdx, train, val, pred, selectedStockKey } = this.localState
        const ys: string[] = [];
        const xs1: object[] = [];
        const xs2: object[] = [];
        const xs3: object[] = [];

        for (i = 0; i < idx.length; i++) {
            ys.push((new Date(idx[i]).toLocaleString()));
        }

        for (i = 0; i < trainIdx.length; i++) {
            xs1.push({t: new Date(trainIdx[i]), y: train[i]});
        }

        for (i = 0; i < validIdx.length; i++) {
            xs2.push({t: new Date(validIdx[i]), y: val[i]});
        }

        for (i = 0; i < validIdx.length; i++) {
            xs3.push({t: new Date(validIdx[i]), y: pred[i]});
        }

        return (
            <Card>
                <div className='chart' dir={'rtl'}>
                    <Line
                        data={{
                            //labels: ys,
                            datasets: [
                                {
                                    label: "Train",
                                    fill: false,
                                    pointStyle: 'line',
                                    radius: 1,
                                    backgroundColor: 'rgba(53,102,246,0.2)',
                                    borderColor: 'rgb(63,141,236)',
                                    borderWidth: 1,
                                    hoverBackgroundColor: 'rgba(53,102,246,0.4)',
                                    hoverBorderColor: 'rgb(63,141,236)',
                                    data: xs1
                                },
                                {
                                    label: "Validation",
                                    fill: false,
                                    pointStyle: 'line',
                                    radius: 1,
                                    backgroundColor: 'rgba(255,99,132,0.2)',
                                    borderColor: 'rgba(255,99,132,1)',
                                    borderWidth: 1,
                                    hoverBackgroundColor: 'rgba(255,99,132,0.4)',
                                    hoverBorderColor: 'rgba(255,99,132,1)',
                                    data: xs2
                                },
                                {
                                    label: "Prediction",
                                    fill: false,
                                    pointStyle: 'line',
                                    radius: 1,
                                    backgroundColor: 'rgba(255,239,99,0.2)',
                                    borderColor: 'rgba(241,164,11,0.79)',
                                    borderWidth: 1,
                                    hoverBackgroundColor: 'rgba(255,239,99,0.4)',
                                    hoverBorderColor: 'rgba(241,164,11,0.79)',
                                    data: xs3
                                }
                            ]
                        }}
                        options={{
                            title: {
                                display: true,
                                text: selectedStockKey,
                                fontSize: 25
                            },
                            scales: {
                                xAxes: [{
                                    type: 'time'
                                }]
                            }
                        }}
                    />
                </div>
            </Card>
        )
    }

    render() {
        const { selectedStock, stockOptions, sectors, isLoading, endTrain } = this.localState;
        const spinner = <div className='spinner-border spinner-border-sm text-white' />;

        return (
            <div className='App'>
                <header>
                    <img src={logo} className="App-logo" alt="logo" />
                </header>
                <body>
                <div>
                    <div className='row'>
                        <div className='col-12 d-flex flex-column align-items-center justify-content-center'>
                            <Carousel controls={false} interval={3000}>
                                {
                                    sectors.map((sec, index) =>(
                                        <Carousel.Item>
                                            <Card>
                                                <div>
                                                    <h3>{sec.name}</h3>
                                                    {sec.d_index}:
                                                    {
                                                        sec.d_val > 0 ?
                                                            <text style={{color: "green"}}> {sec.d_val}%</text>:
                                                            <text style={{color: "red"}}> {sec.d_val}%</text>
                                                    }
                                                </div>
                                                <div>
                                                    {sec.m_index}:
                                                    {
                                                        sec.m_val > 0 ?
                                                            <text style={{color: "green"}}> {sec.m_val}%</text>:
                                                            <text style={{color: "red"}}> {sec.m_val}%</text>
                                                    }
                                                </div>
                                            </Card>
                                        </Carousel.Item>
                                    ))
                                }
                            </Carousel>
                        </div>
                    </div>
                    <div className='row'>
                        <div className='col-12 d-flex flex-column align-items-center justify-content-center'>
                            <Card>
                                <div className='col-10 offset-1'>
                                    <div className="col-12">
                                        <Select
                                            value={selectedStock}
                                            onChange={this.handleChange}
                                            options={stockOptions}
                                            placeholder='Select a stock..'
                                        />
                                    </div>
                                    <button className='btn btn-dark col-10 offset-1 font-weight-bold' disabled={!this.isStockDataValid} onClick={this.train}>
                                        {
                                            isLoading ?
                                                spinner :
                                                <React.Fragment><FontAwesome.FaDollarSign/><span>Calculate stock close price</span><FontAwesome.FaDollarSign/></React.Fragment>
                                        }
                                    </button>
                                </div>
                            </Card>
                        </div>
                    </div>
                    {
                        !endTrain ?
                            <div>
                            </div>:
                            this.renderChart()
                    }
                    {
                        !endTrain ?
                            <div>
                            </div>:
                            this.renderPrediction()
                    }
                </div>
                </body>
            </div>
        );
    }
}

export default App;
