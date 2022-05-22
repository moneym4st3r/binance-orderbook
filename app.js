const bookkeeper = {
    init: async function(pair) {
        getBook(pair).then((books) =>
            sessionStorage.setItem('book', JSON.stringify(parseBook(books))),
            //$('#storageElem').text(JSON.stringify(parseBook(books)))
        )
    },
    read: function() {
        //return JSON.parse($('#storageElem').text());
        return JSON.parse(sessionStorage.getItem('book'))
        
    },
    update: function(data) {
       // $('#storageElem').text(JSON.stringify(data));
        sessionStorage.setItem('book', JSON.stringify(data))

    },
    listen: function(pair) {
        let socket = new WebSocket(
            'wss://stream.binance.com:9443/ws/' +
            pair.toString().toLowerCase() +
            '@depth',
        )
        socket.onmessage = function(event) {
            let data = JSON.parse(event.data)
            let book = bookkeeper.read()
            const newBook = updateTheBooks(book, parseUpdate(data))
            const updatedBook = {
                bids: newBook.bids.filter((bid) => bid.amount > 0),
                asks: newBook.asks.filter((ask) => ask.amount > 0),
            }
            bookkeeper.update(updatedBook)

            render(updatedBook)
        }
    },
}

function updateTheBooks(oldBook, update) {
    let newBook = {
        bids: [],
        asks: [],
    }
    let sumBidAsset = 0
    let sumBidQuote = 0
    let sumAskAsset = 0
    let sumAskQuote = 0

    let asksD = newLevels(oldBook.asks, update.asks)
    let bidsD = newLevels(oldBook.bids, update.bids)
    if (asksD.length > 0) {
        asksD.forEach((ask) => {
            oldBook.asks.push(ask)
        })
    }
    if (bidsD.length > 0) {
        bidsD.forEach((bid) => {
            oldBook.bids.push(bid)
        })
    }
    for (let i = 0; i < oldBook.bids.length; i++) {
        let bid = oldBook.bids[i]
        for (let j = 0; j < update.bids.length; j++) {
            let updateBid = update.bids[j]
            if (bid.price == updateBid.price) {
                bid.amount = updateBid.amount
                bid.total = updateBid.total
            }
        }

        sumBidAsset += bid.amount
        sumBidQuote += bid.total
        bid.sumAsset = sumBidAsset
        bid.sumQuote = sumBidQuote
        newBook.bids.push(bid)
    }
    for (let i = 0; i < oldBook.asks.length; i++) {
        let ask = oldBook.asks[i]
        for (let j = 0; j < update.asks.length; j++) {
            let updateAsk = update.asks[j]
            if (ask.price == updateAsk.price) {
                ask.amount = updateAsk.amount
                ask.total = updateAsk.total
            }
        }
        sumAskAsset += ask.amount
        sumAskQuote += ask.total
        ask.sumAsset = sumAskAsset
        ask.sumQuote = sumAskQuote
        newBook.asks.push(ask)
    }
    
    const book= {
        bids: newBook.bids.sort(function(a, b) {
            return parseFloat(b.price) - parseFloat(a.price)
        }),

        asks: newBook.asks.sort(function(a, b) {
            return parseFloat(a.price) - parseFloat(b.price)
        })
    }
    return book
}

function parseBook(data) {
    let buyRaw = data.bids
    let sellRaw = data.asks

    let buy = buyRaw.map((order) => {
        return {
            price: parseFloat(order[0]),
            amount: parseFloat(order[1]),
            total: order[0] * order[1],
        }
    })
    let sell = sellRaw.map((order) => {
        return {
            price: parseFloat(order[0]),
            amount: parseFloat(order[1]),
            total: order[0] * order[1],
        }
    })

    return {
        bids: buy,
        asks: sell,
    }
}

function parseUpdate(data) {
    let adjData = {
        bids: data.b,
        asks: data.a,
    }
    return parseBook(adjData)
}
async function getBook(pair) {

    const limit = $('#orderLimit').val()
    try {
        let res = await axios({
            url: 'https://api.binance.com/api/v1/depth?symbol=' +
                pair.toString().toUpperCase() +
                '&limit='+limit,
            method: 'get',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json',
            },
        })
        if (res.status == 200) {
            // test for status you want, etc
            console.log(res.status)
        }
        // Don't forget to return something
        return res.data
    } catch (err) {
        console.error(err)
    }
}

function render(book) {
    const htmlBids = htmlBid(book)
    const htmlAsks = htmlAsk(book)
    const rangeData = getRangeData(book)
    const htmlRange = {
        bid:htmlBidRange(rangeData),
        ask:htmlAskRange(rangeData),
    }
    var precision = parseInt(getPrecision());
    var total = parseFloat(rangeData.bid.total).toFixed(precision)-parseFloat(rangeData.ask.total).toFixed(precision);
    if(total>0){
        $(".float").text(total).css('background-color','green');
    }else{
        total = -1*total;
        $(".float").text(total).css('background-color','red');
    }
    $('#bidTotalRange').html(htmlRange.bid)
    $('#askTotalRange').html(htmlRange.ask)
    $('#orderBookDataBuy').html(htmlBids)
    $('#orderBookDataSell').html(htmlAsks)
}
/*
                    buy          <tr> <td>price</td> <td>asset</td> <td>quote</td> <td>total asset</td> <td>total quote</td> </tr>
                    sell         <tr> <td>total quote</td> <td>total asset</td> <td>quote</td> <td>asset</td> <td>price</td> </tr>
*/
function htmlBid(book) {
    let html = ''
    for (let i = 0; i < book.bids.length; i++) {
        html += '<tr>'
        html += '<td>' + book.bids[i].price + '</td>'
        html += '<td>' + book.bids[i].amount + '</td>'
        html += '<td>' + parseFloat(book.bids[i].total).toFixed(2) + '</td>'
        html += '<td>' + parseFloat(book.bids[i].sumAsset).toFixed(2) + '</td>'
        html += '<td>' + parseFloat(book.bids[i].sumQuote).toFixed(2) + '</td>'
        html += '</tr>'
    }
    return html
}
function htmlAsk(book) {
    let html = ''
    for (let i = 0; i < book.asks.length; i++) {
        html += '<tr>'
        html += '<td>' + parseFloat(book.asks[i].sumQuote).toFixed(2) + '</td>'
        html += '<td>' + parseFloat(book.asks[i].sumAsset).toFixed(2) + '</td>'
        html += '<td>' + parseFloat(book.asks[i].total).toFixed(2) + '</td>'
        html += '<td>' + book.asks[i].amount + '</td>'
        html += '<td>' + book.asks[i].price + '</td>'
        html += '</tr>'
    }
    return html
}
function htmlBidRange(rangeData) {
    var precision = parseInt(getPrecision());
    var total = parseFloat(rangeData.bid.total).toFixed(precision)-parseFloat(rangeData.ask.total).toFixed(precision);
    var bidcolor='';
    var askcolor='';
    if(total<0) {
        bidcolor='red';
        askcolor='green';
    } else {
        bidcolor='green';
        askcolor='red';
    }


    return '<td></td><td>'+rangeData.bid.price[0]+'</td><td>'+rangeData.bid.price[1]+'</td><td style="color:'+bidcolor+'">'+rangeData.bid.total.toFixed(precision)+'</td>';
}
function htmlAskRange(rangeData) {
    var precision = parseInt(getPrecision());
    var total = parseFloat(rangeData.bid.total).toFixed(precision)-parseFloat(rangeData.ask.total).toFixed(precision);
    var bidcolor='';
    var askcolor='';
    if(total<0) {
        bidcolor='red';
        askcolor='green';
    } else {
        bidcolor='green';
        askcolor='red';
    }
    return '<td style="color:'+askcolor+'">'+rangeData.ask.total.toFixed(precision)+'</td><td>'+rangeData.ask.price[0]+'</td><td>'+rangeData.ask.price[1]+'</td>';
}
function getPrecision(){
    return $("#pricePrecision").val();
}
function getRangeData(book) {
    var rangeData = {
        bid:{
            price: [],
            amount: 0,
            total: 0,
        },
        ask:{
            price: [],
            amount: 0,
            total: 0,
        }
    }
    let bidLimits = getBidLimit();
    let askLimits = getAskLimit();
    book.bids.forEach((bid) => {
        if (bid.price >= bidLimits.min && bid.price <= bidLimits.max) {
            rangeData.bid.price.push(bid.price)
            rangeData.bid.amount += bid.amount
            rangeData.bid.total += bid.total
        }
    }
    )
    book.asks.forEach((ask) => {
        if (ask.price >= askLimits.min && ask.price <= askLimits.max) {
            rangeData.ask.price.push(ask.price)
            rangeData.ask.amount += ask.amount
            rangeData.ask.total += ask.total
        }
    }
    )
    bidPrices = rangeData.bid.price.sort(function(a, b) {
        return parseFloat(a) - parseFloat(b)
    })
    askPrices = rangeData.ask.price.sort(function(a, b) {
        return parseFloat(a) - parseFloat(b)
    })
    let res ={
        bid: {
            price: [bidPrices[0], bidPrices[bidPrices.length - 1]],
            amount: rangeData.bid.amount,
            total: rangeData.bid.total,
        },
        ask: {
            price: [askPrices[0], askPrices[askPrices.length - 1]],
            amount: rangeData.ask.amount,
            total: rangeData.ask.total,
        },
    };
    return res;

}
function getBidLimit() {
    up=$('#upLimitBidInput').val()
    down=$('#dnLimitBidInput').val()
    return {
        max:parseFloat(up),
        min:parseFloat(down)
    }
}
function getAskLimit() {
    up=$('#upLimitAskInput').val()
    down=$('#dnLimitAskInput').val()
    return {
        max:parseFloat(up),
        min:parseFloat(down)
    }
}

function newLevels(a, b) {
    const isSamePrice = (a, b) => a.price === b.price
    const onlyInLeft = (left, right, compareFunction) =>
        left.filter(
            (leftValue) =>
            !right.some((rightValue) => compareFunction(leftValue, rightValue)),
        )

    const onlyInA = onlyInLeft(a, b, isSamePrice)
    const onlyInB = onlyInLeft(b, a, isSamePrice)

    const result = [...onlyInB]

    return result
}
$('#loadOrderBook').click(function() {
    const asset = $('#assetInput').val()
    const quote = $('#quoteInput').val()
    $('.asset').text(asset.toUpperCase())
    $('.quote').text(quote.toUpperCase())
    const pair = asset + quote
    bookkeeper.init(pair)
    bookkeeper.listen(pair)
})

/*
$(document).ready(function() {
    const asset = 'BTC'
    const quote = 'USDT'
    $('.asset').text(asset.toUpperCase())
    $('.quote').text(quote.toUpperCase())
    const pair = asset + quote
    bookkeeper.init(pair)
    bookkeeper.listen(pair)
});
*/